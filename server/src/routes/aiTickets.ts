import { Router, Request, Response } from 'express';
import { Ticket, Customer, CallRecord, TicketComment } from '../models';
import { authMiddleware } from '../middleware/auth';
import { azureCallAutomationService } from '../services/azureCallAutomation';
import { ticketAIAnalyzer } from '../services/aiAnalyzer';

const router = Router();

// 核心接口：点击工单 -> AI自动打电话
router.post('/:id/auto-call', authMiddleware, async (req: Request, res: Response) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id, {
      include: [{ model: Customer, as: 'customer' }],
    });

    if (!ticket) {
      return res.status(404).json({ error: '工单不存在' });
    }

    const customer = (ticket as any).customer;
    if (!customer) {
      return res.status(400).json({ error: '工单未关联客户信息' });
    }

    // 1. 生成AI话术
    const prompts = ticketAIAnalyzer.getPromptsForTicket(ticket);

    // 2. 发起自动化通话
    const session = await azureCallAutomationService.startAutomatedCall({
      ticket: ticket.toJSON ? ticket.toJSON() : ticket,
      customerPhone: customer.phone,
      customerName: customer.name,
      prompts,
    });

    // 3. 如果通话失败，返回提示
    if (session.status === 'failed') {
      return res.json({
        success: false,
        message: '通话失败：' + session.messages[session.messages.length - 1]?.text,
        session,
      });
    }

    // 4. 对通话文本进行AI分析
    const transcript = session.transcript;
    const analysis = await ticketAIAnalyzer.analyzeWithLLM(transcript, ticket);

    // 5. 更新工单状态
    const now = new Date();
    const durationSec = session.endTime
      ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000)
      : Math.round((now.getTime() - session.startTime.getTime()) / 1000);

    let newStatus = ticket.status;
    let autoCloseNote = '';

    if (analysis.shouldClose && analysis.confidence >= 0.6) {
      newStatus = 'resolved';
      autoCloseNote = '【AI自动处理】客户确认问题解决，工单自动完结';
    } else {
      autoCloseNote = `【AI建议】${analysis.nextAction} | 置信度: ${analysis.confidence.toFixed(2)}`;
    }

    await ticket.update({
      status: newStatus,
      resolution: (ticket as any).resolution
        ? (ticket as any).resolution + '\n' + autoCloseNote
        : autoCloseNote,
    });

    // 6. 写入通话记录
    const callRecord = await CallRecord.create({
      direction: 'outbound',
      customerPhone: customer.phone,
      customerName: customer.name,
      agentId: (req as any).user?.id || 1,
      status: session.status === 'completed' ? 'connected' : 'missed',
      startTime: session.startTime,
      endTime: session.endTime || now,
      duration: durationSec,
      recordingUrl: session.recordings[0] || '',
      callId: session.callId,
      notes: `[AI通话]\n文本:\n${transcript}\n\n关键词: ${analysis.keywords.join(', ')}\n摘要: ${analysis.summary}\n情感: ${analysis.sentiment.label} | 满意度: ${analysis.satisfaction.toFixed(1)}/5`,
      ticketId: ticket.id,
      customerId: customer.id,
    });

    // 7. 写入工单评论（便于追溯）
    await TicketComment.create({
      ticketId: ticket.id,
      authorId: (req as any).user?.id || 1,
      content: `🤖 AI自动通话完成\n\n📝 通话摘要:\n${analysis.summary}\n\n🏷 关键词: ${analysis.keywords.join(', ')}\n\n💡 AI建议: ${analysis.nextAction}\n\n📊 情感分析: ${analysis.sentiment.label} (置信度 ${analysis.confidence.toFixed(2)})\n\n📞 通话时长: ${durationSec}秒\n\n是否建议关闭工单: ${analysis.shouldClose ? '✅ 是' : '❌ 否'}`,
      type: 'internal',
    });

    res.json({
      success: true,
      session,
      analysis,
      newStatus,
      callRecordId: (callRecord as any).id,
    });
  } catch (err: any) {
    console.error('[AI自动通话] 出错:', err);
    res.status(500).json({ error: err.message || '处理失败' });
  }
});

// 查询通话会话状态（用于前端轮询）
router.get('/session/:callId', authMiddleware, (req: Request, res: Response) => {
  const session = azureCallAutomationService.getSession(req.params.callId);
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }
  res.json(session);
});

// Azure ACS 回调接口（用于接收通话事件）
router.post('/azure/callback', async (req: Request, res: Response) => {
  try {
    const callId = req.query.callId as string;
    if (callId) {
      azureCallAutomationService.updateSessionFromCallback(callId, req.body);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: '回调处理失败' });
  }
});

// 批量AI处理多个工单（高级功能）
router.post('/batch-auto-call', authMiddleware, async (req: Request, res: Response) => {
  try {
    const ticketIds: number[] = req.body.ticketIds || [];
    if (ticketIds.length === 0) {
      return res.status(400).json({ error: '请提供工单ID列表' });
    }
    if (ticketIds.length > 20) {
      return res.status(400).json({ error: '单次最多处理20个工单' });
    }

    const results = [];

    for (const ticketId of ticketIds) {
      try {
        const ticket = await Ticket.findByPk(ticketId, {
          include: [{ model: Customer, as: 'customer' }],
        });

        if (!ticket || !(ticket as any).customer) {
          results.push({ ticketId, success: false, reason: '工单或客户信息不存在' });
          continue;
        }

        const prompts = ticketAIAnalyzer.getPromptsForTicket(ticket);
        const session = await azureCallAutomationService.startAutomatedCall({
          ticket: ticket.toJSON ? ticket.toJSON() : ticket,
          customerPhone: (ticket as any).customer.phone,
          customerName: (ticket as any).customer.name,
          prompts,
        });

        const analysis = await ticketAIAnalyzer.analyzeWithLLM(session.transcript, ticket);

        if (analysis.shouldClose && analysis.confidence >= 0.6) {
          await ticket.update({
            status: 'resolved',
            resolution: `【AI自动处理】${analysis.summary}`,
          });
        }

        results.push({
          ticketId,
          success: true,
          status: session.status,
          shouldClose: analysis.shouldClose,
          confidence: analysis.confidence,
          summary: analysis.summary,
        });
      } catch (err: any) {
        results.push({ ticketId, success: false, reason: err.message });
      }
    }

    res.json({ success: true, total: results.length, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '批量处理失败' });
  }
});

export default router;
