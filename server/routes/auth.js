// 用户/认证 API
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateToken, auth } = require('../middleware/auth');

const router = express.Router();

function toUserJSON(u) {
  if (!u) return u;
  const raw = typeof u.toJSON === 'function' ? u.toJSON() : u;
  return {
    id: raw.id,
    username: raw.username,
    realName: raw.real_name || raw.realName || raw.name,
    role: raw.role,
    phone: raw.phone,
    email: raw.email,
    status: raw.status,
    totalCalls: raw.total_calls ?? raw.totalCalls,
    totalTickets: raw.total_tickets ?? raw.totalTickets,
    avgHandleTime: raw.avg_handle_time ?? raw.avgHandleTime,
    satisfaction: raw.satisfaction,
    createdAt: raw.created_at || raw.createdAt,
    updatedAt: raw.updated_at || raw.updatedAt,
  };
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const user = await db.User.findOne({ where: { username } });
    if (!user) return res.status(401).json({ error: '账号不存在' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: '密码错误' });
    await db.User.update({ status: 'online' }, { where: { id: user.id } });
    const token = generateToken(user);
    const safeUser = toUserJSON(user);
    safeUser.status = 'online';
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', auth, async (req, res) => {
  try {
    if (req.user?.id) await db.User.update({ status: 'offline' }, { where: { id: req.user.id } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json(toUserJSON(user));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/status', auth, async (req, res) => {
  try {
    const { status } = req.body || {};
    await db.User.update({ status }, { where: { id: req.user.id } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/agents', auth, async (req, res) => {
  try {
    const users = await db.User.findAll({ order: [['created_at', 'ASC']] });
    res.json(users.map(toUserJSON));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/agents/stats', auth, async (req, res) => {
  try {
    const [total, online, busy, offline] = await Promise.all([
      db.User.count(),
      db.User.count({ where: { status: 'online' } }),
      db.User.count({ where: { status: 'busy' } }),
      db.User.count({ where: { status: 'offline' } }),
    ]);
    res.json({ total, online, busy, offline });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/change-password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) return res.status(400).json({ error: '旧密码和新密码必填' });
    const user = await db.User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return res.status(400).json({ error: '旧密码错误' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.User.update({ password: hashed }, { where: { id: user.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('change-password error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
