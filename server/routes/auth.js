// 用户/认证 API
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateToken, auth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = db.findOne('users', u => u.username === username);
  if (!user) return res.status(401).json({ error: '账号不存在' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: '密码错误' });
  db.update('users', u => u.id === user.id, { status: 'online' });
  const token = generateToken(user);
  const safeUser = { id: user.id, username: user.username, name: user.name, role: user.role, status: 'online' };
  res.json({ token, user: safeUser });
});

router.post('/logout', auth, (req, res) => {
  if (req.user) db.update('users', u => u.id === req.user.id, { status: 'offline' });
  res.json({ success: true });
});

router.get('/me', auth, (req, res) => {
  const user = db.findOne('users', u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({ id: user.id, username: user.username, name: user.name, role: user.role, phone: user.phone, status: user.status });
});

router.patch('/status', auth, (req, res) => {
  db.update('users', u => u.id === req.user.id, { status: req.body.status });
  res.json({ success: true });
});

router.get('/agents', auth, (req, res) => {
  const agents = db.getAll('users').map(u => ({ id: u.id, name: u.name, role: u.role, phone: u.phone, status: u.status }));
  res.json(agents);
});

router.get('/agents/stats', auth, (req, res) => {
  const users = db.getAll('users');
  res.json({
    total: users.length,
    online: users.filter(u => u.status === 'online').length,
    busy: users.filter(u => u.status === 'busy').length,
    offline: users.filter(u => u.status === 'offline').length,
  });
});

module.exports = router;
