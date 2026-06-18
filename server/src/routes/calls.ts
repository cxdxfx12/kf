import { Router, Request, Response } from 'express';
import { Op, fn, col } from 'sequelize';
import { CallRecord, User, Customer } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { callCenterService } from '../services/callCenter';

const router = Router();

// 通话记录列表
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const keyword = (req.query.keyword as string) || '';
    const status = (req.query.status as string) || '';
    const agentId = req.query.agentId ? Number(req.query.agentId) : null;

    const where: any = {};
    if (keyword) where[Op.or] = [
      { customerPhone: { [Op.like]: `%${keyword}%` } },
      { customerName: { [Op.like]: `%${keyword}%` } },
    ];
    if (status) where.status = status;
    if (agentId) where.agentId = agentId;

    const result = await CallRecord.findAndCountAll({
      where, order: [['id', 'DESC']],
      limit: pageSize, offset: (page - 1) * pageSize,
      include: [
        { model: User, as: 'agent', attributes: ['id', 'realName'] },
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'vip'] },
      ],
    });
    res.json({ total: result.count, rows: result.rows });
  } catch (err) { res.status(500).json({ error: '查询失败', detail: (err as any).message }); }
});

// 详情
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const call = await CallRecord.findByPk(Number(req.params.id), {
      include: [
        { model: User, as: 'agent', attributes: ['id', 'realName', 'phone'] },
        { model: Customer, as: 'customer' },
      ],
    });
    if (!call) return res.status(404).json({ error: '记录不存在' });
    res.json(call);
  } catch (err) { res.status(500).json({ error: '查询失败', detail: (err as any).message }); }
});

// 创建（用于手动记录）
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { direction, customerPhone, customerName, status, duration, notes, ticketId, customerId } = req.body;
    const record = await CallRecord.create({
      direction: direction || 'outbound', customerPhone, customerName,
      agentId: req.user!.id, status: status || 'connected',
      startTime: new Date(), endTime: new Date(),
      duration: duration || 0, notes, ticketId, customerId,
    });
    res.json(record);
  } catch (err) { res.status(500).json({ error: '创建失败', detail: (err as any).message }); }
});

// 更新
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await CallRecord.update(req.body, { where: { id } });
    const record = await CallRecord.findByPk(id);
    res.json(record);
  } catch (err) { res.status(500).json({ error: '更新失败', detail: (err as any).message }); }
});

// 外呼（呼叫中心 SDK 接口）
router.post('/outbound/call', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { customerPhone } = req.body;
    if (!customerPhone) return res.status(400).json({ error: '客户手机号必填' });
    // 使用当前客服人员电话作为发起号码
    const agent: any = await User.findByPk(req.user!.id);
    const result = await callCenterService.makeCall(agent?.phone || '', customerPhone);
    if (result.success) {
      // 创建通话记录
      await CallRecord.create({
        direction: 'outbound', customerPhone, customerName: customerPhone,
        agentId: req.user!.id, status: 'connected',
        startTime: new Date(), callId: result.callId,
      });
    }
    res.json(result);
  } catch (err) { res.status(500).json({ error: '呼叫失败', detail: (err as any).message }); }
});

// 获取可用呼叫中心服务
router.get('/services/providers', authMiddleware, async (_req: Request, res: Response) => {
  try {
    res.json(callCenterService.getProviders());
  } catch (err) { res.status(500).json({ error: '查询失败', detail: (err as any).message }); }
});

// 通话统计（仪表盘用）
router.get('/stats/summary', authMiddleware, async (req: Request, res: Response) => {
  try {
    const agentId = req.query.agentId ? Number(req.query.agentId) : null;
    const where: any = {};
    if (agentId) where.agentId = agentId;

    const total = await CallRecord.count({ where });
    const inbound = await CallRecord.count({ where: { ...where, direction: 'inbound' } });
    const outbound = await CallRecord.count({ where: { ...where, direction: 'outbound' } });
    const connected = await CallRecord.count({ where: { ...where, status: 'connected' } });
    const missed = await CallRecord.count({ where: { ...where, status: 'missed' } });

    const avgResult: any = await CallRecord.findOne({
      where,
      attributes: [[fn('AVG', col('duration')), 'avgDuration']],
      raw: true,
    });

    res.json({ total, inbound, outbound, connected, missed, avgDuration: Number(avgResult?.avgDuration || 0) });
  } catch (err) { res.status(500).json({ error: '统计失败', detail: (err as any).message }); }
});

export default router;
