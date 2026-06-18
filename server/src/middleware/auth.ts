import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User } from '../models';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    realName: string;
    role: 'admin' | 'manager' | 'agent';
  };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as any;

    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'username', 'realName', 'role', 'phone', 'email', 'status'],
    });

    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: '用户不存在或已被禁用' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      realName: user.realName,
      role: user.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: '令牌无效或已过期' });
  }
};

export const requireRole = (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });
  if (roles.length > 0 && !roles.includes(req.user.role)) {
    return res.status(403).json({ error: '权限不足' });
  }
  next();
};
