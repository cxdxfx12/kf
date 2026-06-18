import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { llmService } from '../services/llm';
import { callCenterService } from '../services/callCenter';
import { SystemConfig } from '../models';

const router = Router();

router.post('/suggest', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { type, description } = req.body;
    if (!description) return res.status(400).json({ error: '描述不能为空' });
    const result = await llmService.aiSuggest(type || '', description);
    res.json(result);
  } catch (err) { res.status(500).json({ error: 'AI 分析失败', detail: (err as any).message }); }
});

router.post('/chat', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { message, systemPrompt } = req.body;
    if (!message) return res.status(400).json({ error: '消息不能为空' });
    const result = await llmService.chat(message, systemPrompt);
    res.json(result);
  } catch (err) { res.status(500).json({ error: '对话失败', detail: (err as any).message }); }
});

router.post('/call', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { from, to } = req.body;
    if (!from || !to) return res.status(400).json({ error: '主叫/被叫号码不能为空' });
    const result = await callCenterService.makeCall(from, to);
    res.json(result);
  } catch (err) { res.status(500).json({ error: '呼叫失败', detail: (err as any).message }); }
});

router.get('/providers', authMiddleware, async (_req, res) => {
  const couriers = [
    { code: 'STO', name: '申通快递' }, { code: 'YTO', name: '圆通速递' },
    { code: 'ZTO', name: '中通快递' }, { code: 'YD', name: '韵达快递' },
    { code: 'EMS', name: 'EMS 邮政' }, { code: 'SF', name: '顺丰速运' },
    { code: 'JD', name: '京东快递' }, { code: 'DBL', name: '德邦快递' },
    { code: 'OTHER', name: '其他' },
  ];
  res.json({
    expressProviders: couriers,
    callCenterProviders: callCenterService.getProviders(),
    llmProviders: llmService.getProviders(),
  });
});

router.get('/config', authMiddleware, async (_req, res) => {
  const list = await SystemConfig.findAll();
  res.json(list);
});

router.post('/config', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { key, value, description } = req.body;
  if (!key) return res.status(400).json({ error: 'key 不能为空' });
  const existing = await SystemConfig.findOne({ key });
  if (existing) {
    const updated = await SystemConfig.update(existing.id, { value, description });
    res.json(updated);
  } else {
    const created = await SystemConfig.create({ key, value, description });
    res.json(created);
  }
});

export default router;
