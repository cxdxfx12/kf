import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { User } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// 列表（带分页、搜索）
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const keyword = (req.query.keyword as string) || '';
    const role = (req.query.role as string) || '';

    const where: any = {};
    if (keyword) where[Op.or] = [
      { username: { [Op.like]: `%${keyword}%` } },
      { realName: { [Op.like]: `%${keyword}%` } },
      { phone: { [Op.like]: `%${keyword}%` } },
    ];
    if (role) where.role = role;

    const result = await User.findAndCountAll({
      where,
      order: [['id', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    const rows = (result.rows as any[]).map(u => {
      const obj = u.toJSON();
      delete obj.password;
      return obj;
    });

    res.json({ total: result.count, rows });
  } catch (err) { res.status(500).json({ error: '查询失败', detail: (err as any).message }); }
});

// 详情
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user: any = await User.findByPk(Number(req.params.id));
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const obj = user.toJSON();
    delete obj.password;
    res.json(obj);
  } catch (err) { res.status(500).json({ error: '查询失败', detail: (err as any).message }); }
});

// 创建
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin' && req.user!.role !== 'manager') return res.status(403).json({ error: '无权限' });
    const { username, password, realName, role, phone, email } = req.body;
    if (!username || !password || !realName) return res.status(400).json({ error: '必填项缺失' });
    const existing = await User.findOne({ where: { username } });
    if (existing) return res.status(400).json({ error: '用户名已存在' });
    const user: any = await User.create({
      username, password: await bcrypt.hash(password, 10),
      realName, role: role || 'agent', phone, email,
    });
    const obj = user.toJSON();
    delete obj.password;
    res.json(obj);
  } catch (err) { res.status(500).json({ error: '创建失败', detail: (err as any).message }); }
});

// 更新
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const isSelf = req.user!.id === id;
    if (!isSelf && req.user!.role !== 'admin' && req.user!.role !== 'manager') {
      return res.status(403).json({ error: '无权限' });
    }
    const { password, realName, role, phone, email, status } = req.body;
    const updates: any = {};
    if (password) updates.password = await bcrypt.hash(password, 10);
    if (realName) updates.realName = realName;
    if (phone) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (status) updates.status = status;
    if (role && (req.user!.role === 'admin' || req.user!.role === 'manager')) updates.role = role;

    await User.update(updates, { where: { id } });
    const user: any = await User.findByPk(id);
    const obj = user.toJSON();
    delete obj.password;
    res.json(obj);
  } catch (err) { res.status(500).json({ error: '更新失败', detail: (err as any).message }); }
});

// 删除
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin') return res.status(403).json({ error: '仅管理员可删除' });
    await User.destroy({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: '删除失败', detail: (err as any).message }); }
});

// 状态列表（所有启用的客服人员，供前端选择派单）
router.get('/agents/list', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const rows = await User.findAll({
      where: { status: 'active' },
      attributes: ['id', 'username', 'realName', 'role', 'phone', 'email', 'totalCalls', 'totalTickets', 'avgHandleTime', 'satisfaction'],
      order: [['realName', 'ASC']],
    });
    res.json(rows);
  } catch (err) { res.status(500).json({ error: '查询失败', detail: (err as any).message }); }
});

export default router;
