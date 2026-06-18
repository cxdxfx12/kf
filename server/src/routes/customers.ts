import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import { Customer, Order, Ticket } from '../models';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// 列表
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const keyword = (req.query.keyword as string) || '';

    const where: any = {};
    if (keyword) where[Op.or] = [
      { name: { [Op.like]: `%${keyword}%` } },
      { phone: { [Op.like]: `%${keyword}%` } },
      { address: { [Op.like]: `%${keyword}%` } },
    ];

    const result = await Customer.findAndCountAll({
      where, order: [['id', 'DESC']],
      limit: pageSize, offset: (page - 1) * pageSize,
    });
    res.json({ total: result.count, rows: result.rows });
  } catch (err) { res.status(500).json({ error: '查询失败', detail: (err as any).message }); }
});

// 详情（含订单和工单）
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const customer: any = await Customer.findByPk(id);
    if (!customer) return res.status(404).json({ error: '客户不存在' });
    const orders = await Order.findAll({ where: { customerId: id }, order: [['id', 'DESC']], limit: 20 });
    const tickets = await Ticket.findAll({ where: { customerId: id }, order: [['id', 'DESC']], limit: 20 });
    res.json({ customer: customer.toJSON(), orders, tickets });
  } catch (err) { res.status(500).json({ error: '查询失败', detail: (err as any).message }); }
});

// 创建
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, phone, address, email, tags, vip, notes } = req.body;
    if (!name || !phone || !address) return res.status(400).json({ error: '必填项缺失' });
    const existing = await Customer.findOne({ where: { phone } });
    if (existing) return res.status(400).json({ error: '该手机号客户已存在' });
    const customer = await Customer.create({
      name, phone, address, email, tags: tags || '', vip: !!vip, notes: notes || '',
    });
    res.json(customer);
  } catch (err) { res.status(500).json({ error: '创建失败', detail: (err as any).message }); }
});

// 更新
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await Customer.update(req.body, { where: { id } });
    const customer = await Customer.findByPk(id);
    res.json(customer);
  } catch (err) { res.status(500).json({ error: '更新失败', detail: (err as any).message }); }
});

// 删除
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await Customer.destroy({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: '删除失败', detail: (err as any).message }); }
});

// 简单列表
router.get('/simple/list', authMiddleware, async (req: Request, res: Response) => {
  try {
    const keyword = (req.query.keyword as string) || '';
    const where: any = {};
    if (keyword) where[Op.or] = [
      { name: { [Op.like]: `%${keyword}%` } },
      { phone: { [Op.like]: `%${keyword}%` } },
    ];
    const rows = await Customer.findAll({ where, attributes: ['id', 'name', 'phone', 'address', 'vip'], order: [['name', 'ASC']], limit: 50 });
    res.json(rows);
  } catch (err) { res.status(500).json({ error: '查询失败', detail: (err as any).message }); }
});

export default router;
