import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { config } from '../config';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// 登录
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '账号/密码不能为空' });

    const user: any = await User.findOne({ where: { username } });
    if (!user) return res.status(401).json({ error: '用户名或密码错误' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: '用户名或密码错误' });
    if (user.status !== 'active') return res.status(403).json({ error: '账号已禁用' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, config.jwt.secret, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id, username: user.username, realName: user.realName, role: user.role, phone: user.phone, email: user.email },
    });
  } catch (err) { res.status(500).json({ error: '登录失败', detail: (err as any).message }); }
});

// 当前用户
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => { res.json({ user: req.user }); });

// 修改密码
router.post('/change-password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user: any = await User.findByPk(req.user!.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return res.status(401).json({ error: '旧密码错误' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: '修改失败', detail: (err as any).message }); }
});

export default router;
