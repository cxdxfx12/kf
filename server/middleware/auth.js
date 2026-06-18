// 认证中间件 - 使用 JWT
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'express-cs-secret-key-2026';

function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未提供认证令牌' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) { res.status(401).json({ error: '认证令牌无效或已过期' }); }
}

function adminAuth(req, res, next) {
  if (req.user && req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({ error: '权限不足' });
  }
  next();
}

function generateToken(user) {
  const plain = typeof user.toJSON === 'function' ? user.toJSON() : user;
  return jwt.sign({
    id: plain.id,
    username: plain.username,
    role: plain.role,
    name: plain.real_name || plain.realName || plain.name || plain.username,
  }, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { auth, adminAuth, generateToken, JWT_SECRET };
