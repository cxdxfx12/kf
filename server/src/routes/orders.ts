import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import { Order, Customer } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { courierService } from '../services/courier';

const router = Router();

// 聚合统计（必须放在 /:id 之前，避免 summary 被解析为 id => NaN）
router.get('/summary', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const { fn, col } = require('sequelize');
    const byStatus = await Order.findAll({ attributes: ['status', [fn('COUNT', col('id')), 'count']], group: ['status'], raw: true });
    const byCourier = await Order.findAll({ attributes: ['courier', [fn('COUNT', col('id')), 'count']], group: ['courier'], raw: true });
    res.json({ byStatus, byCourier });
  } catch (err) { res.status(500).json({ error: '查询失败', detail: (err as any).message }); }
});

// 列表
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const keyword = (req.query.keyword as string) || '';
    const status = (req.query.status as string) || '';
    const courier = (req.query.courier as string) || '';

    const where: any = {};
    if (keyword) where[Op.or] = [
      { trackingNumber: { [Op.like]: `%${keyword}%` } },
      { receiverName: { [Op.like]: `%${keyword}%` } },
      { receiverPhone: { [Op.like]: `%${keyword}%` } },
      { senderName: { [Op.like]: `%${keyword}%` } },
    ];
    if (status) where.status = status;
    if (courier) where.courier = courier;

    const result = await Order.findAndCountAll({
      where, order: [['id', 'DESC']],
      limit: pageSize, offset: (page - 1) * pageSize,
      include: [{ model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'vip'] }],
    });
    res.json({ total: result.count, rows: result.rows });
  } catch (err) { res.status(500).json({ error: '查询失败', detail: (err as any).message }); }
});

// 详情 + 物流动态
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const order: any = await Order.findByPk(Number(req.params.id), {
      include: [{ model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'address'] }],
    });
    if (!order) return res.status(404).json({ error: '订单不存在' });
    const oj = order.toJSON();
    let tracking: any[] = [];
    try { tracking = JSON.parse(oj.trackingInfo || '[]'); } catch { tracking = []; }
    oj.tracking = tracking;
    delete oj.trackingInfo;
    res.json(oj);
  } catch (err) { res.status(500).json({ error: '查询失败', detail: (err as any).message }); }
});

// 创建
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    data.createdBy = req.user!.id;
    if (!data.trackingNumber) data.trackingNumber = `${Date.now()}`;
    // 模拟：生成初始物流动态
    data.trackingInfo = JSON.stringify([{
      time: new Date().toISOString(),
      status: '已揽收',
      location: '网点仓库',
      description: '快递员已揽件',
    }]);
    if (!data.estimatedDelivery) {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      data.estimatedDelivery = d;
    }
    const order = await Order.create(data);
    res.json(order);
  } catch (err) { res.status(500).json({ error: '创建失败', detail: (err as any).message }); }
});

// 更新
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const updates = { ...req.body };
    delete updates.trackingInfo; // 避免误删
    await Order.update(updates, { where: { id } });
    const order = await Order.findByPk(id);
    res.json(order);
  } catch (err) { res.status(500).json({ error: '更新失败', detail: (err as any).message }); }
});

// 删除
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await Order.destroy({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: '删除失败', detail: (err as any).message }); }
});

// 按运单号查询 + 自动拉取物流
router.get('/track/:courier/:trackingNumber', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { courier, trackingNumber } = req.params;
    const local = await Order.findOne({ where: { trackingNumber, courier } });
    // 调用快递鸟/菜鸟模拟接口拉取最新物流
    const remote = await courierService.track(courier, trackingNumber);
    res.json({ local: local ? (local as any).toJSON() : null, remote: remote.data });
  } catch (err) { res.status(500).json({ error: '查询失败', detail: (err as any).message }); }
});

// 状态变更（并更新物流动态）
router.post('/:id/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, location, description } = req.body;
    const order: any = await Order.findByPk(id);
    if (!order) return res.status(404).json({ error: '订单不存在' });

    let tracking: any[] = [];
    try { tracking = JSON.parse(order.trackingInfo || '[]'); } catch { tracking = []; }
    tracking.unshift({
      time: new Date().toISOString(),
      status: status || order.status,
      location: location || '网点',
      description: description || '状态更新',
    });

    await Order.update({ status: status || order.status, trackingInfo: JSON.stringify(tracking) }, { where: { id } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: '更新失败', detail: (err as any).message }); }
});

// 生成电子面单
router.post('/waybill', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { courier, sender, receiver, weight } = req.body;
    const result = await courierService.generateWaybill(courier || 'sto', { sender, receiver, weight });
    res.json(result);
  } catch (err) { res.status(500).json({ error: '面单生成失败', detail: (err as any).message }); }
});

export default router;
