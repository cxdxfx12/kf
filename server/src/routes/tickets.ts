import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import { Ticket, TicketComment, Customer, Order, User } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { llmService } from '../services/llm';

const router = Router();

// 聚合统计（必须放在 /:id 之前，否则 summary 会被当成 id）
router.get('/summary', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const { Op, fn, col } = require('sequelize');
    const byStatus = await Ticket.findAll({ attributes: ['status', [fn('COUNT', col('id')), 'count']], group: ['status'], raw: true });
    const byPriority = await Ticket.findAll({ attributes: ['priority', [fn('COUNT', col('id')), 'count']], group: ['priority'], raw: true });
    const byType = await Ticket.findAll({ attributes: ['type', [fn('COUNT', col('id')), 'count']], group: ['type'], raw: true });
    const avgRow: any = await Ticket.findOne({ attributes: [[fn('AVG', col('satisfaction')), 'avg']], raw: true });
    res.json({ byStatus, byPriority, byType, avgSatisfaction: Number(avgRow?.avg || 0) });
  } catch (err) { res.status(500).json({ error: '查询失败', detail: (err as any).message }); }
});

// 列表
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const keyword = (req.query.keyword as string) || '';
    const status = (req.query.status as string) || '';
    const priority = (req.query.priority as string) || '';
    const type = (req.query.type as string) || '';
    const assignedTo = req.query.assignedTo ? Number(req.query.assignedTo) : null;

    const where: any = {};
    if (keyword) where[Op.or] = [
      { title: { [Op.like]: `%${keyword}%` } },
      { description: { [Op.like]: `%${keyword}%` } },
    ];
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (type) where.type = type;
    if (assignedTo) where.assignedTo = assignedTo;

    const result = await Ticket.findAndCountAll({
      where, order: [['id', 'DESC']],
      limit: pageSize, offset: (page - 1) * pageSize,
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'vip'] },
        { model: User, as: 'assignee', attributes: ['id', 'realName'] },
        { model: Order, as: 'order', attributes: ['id', 'trackingNumber', 'courier', 'status'] },
      ],
    });
    res.json({ total: result.count, rows: result.rows });
  } catch (err) { res.status(500).json({ error: '查询失败', detail: (err as any).message }); }
});

// 详情
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const ticket: any = await Ticket.findByPk(Number(req.params.id), {
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'address'] },
        { model: User, as: 'creator', attributes: ['id', 'realName'] },
        { model: User, as: 'assignee', attributes: ['id', 'realName'] },
        { model: Order, as: 'order' },
        { model: TicketComment, as: 'thread', include: [{ model: User, as: 'author', attributes: ['id', 'realName'] }], order: [['id', 'DESC']] },
      ],
    });
    if (!ticket) return res.status(404).json({ error: '工单不存在' });
    res.json(ticket);
  } catch (err) { res.status(500).json({ error: '查询失败', detail: (err as any).message }); }
});

// 创建
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, type, priority, description, orderId, customerId, assignedTo } = req.body;
    if (!title || !description) return res.status(400).json({ error: '标题和描述必填' });
    const ticket = await Ticket.create({
      title, type: type || 'query', priority: priority || 'medium',
      description, orderId, customerId,
      createdBy: req.user!.id,
      assignedTo: assignedTo || null,
      status: assignedTo ? 'assigned' : 'open',
    });
    res.json(ticket);
  } catch (err) { res.status(500).json({ error: '创建失败', detail: (err as any).message }); }
});

// 更新
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await Ticket.update(req.body, { where: { id } });
    const ticket = await Ticket.findByPk(id);
    res.json(ticket);
  } catch (err) { res.status(500).json({ error: '更新失败', detail: (err as any).message }); }
});

// 删除
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await Ticket.destroy({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: '删除失败', detail: (err as any).message }); }
});

// 派单
router.post('/:id/assign', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { assignedTo } = req.body;
    if (!assignedTo) return res.status(400).json({ error: '指派人必填' });
    await Ticket.update({ assignedTo, status: 'assigned' }, { where: { id } });
    // 添加备注
    await TicketComment.create({ ticketId: id, authorId: req.user!.id, type: 'internal', content: `已指派给 ${assignedTo}` });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: '派单失败', detail: (err as any).message }); }
});

// 解决/关闭
router.post('/:id/resolve', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { resolution, satisfaction } = req.body;
    const updates: any = { resolution: resolution || '', status: 'resolved' };
    if (satisfaction) updates.satisfaction = satisfaction;
    await Ticket.update(updates, { where: { id } });
    await TicketComment.create({ ticketId: id, authorId: req.user!.id, type: 'reply', content: resolution || '已解决' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: '操作失败', detail: (err as any).message }); }
});

// 添加备注
router.post('/:id/comments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { content, type } = req.body;
    if (!content) return res.status(400).json({ error: '内容必填' });
    const comment = await TicketComment.create({ ticketId: id, authorId: req.user!.id, type: type || 'note', content });
    res.json(comment);
  } catch (err) { res.status(500).json({ error: '失败', detail: (err as any).message }); }
});

// AI 建议处理方案
router.post('/ai/suggest', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { type, description } = req.body;
    const result = await llmService.aiSuggest(type || 'query', description || '');
    res.json(result);
  } catch (err) { res.status(500).json({ error: 'AI 建议失败', detail: (err as any).message }); }
});

// AI 自动回复
router.post('/ai/reply', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await llmService.aiReply(req.body.message || '', req.body.context || []);
    res.json(result);
  } catch (err) { res.status(500).json({ error: 'AI 回复失败', detail: (err as any).message }); }
});

export default router;
