// 用户管理 API
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { auth, adminAuth } = require('../middleware/auth');

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
    totalCalls: raw.total_calls ?? raw.totalCalls ?? 0,
    totalTickets: raw.total_tickets ?? raw.totalTickets ?? 0,
    avgHandleTime: raw.avg_handle_time ?? raw.avgHandleTime ?? 0,
    satisfaction: raw.satisfaction ?? 0,
    createdAt: raw.created_at || raw.createdAt,
    updatedAt: raw.updated_at || raw.updatedAt,
  };
}

router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const { role } = req.query;
    const where = {};
    if (role && role !== 'all') where.role = role;
    const result = await db.paginate(db.User, { page, pageSize, where, order: [['created_at', 'DESC']] });
    const rows = await Promise.all(result.rows.map(async (u) => {
      const totalCalls = await db.CallRecord.count({ where: { agent_id: u.id } });
      const totalTickets = await db.Ticket.count({ where: { assigned_to: u.id } });
      return { ...u, totalCalls, totalTickets };
    }));
    res.json({ ...result, rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, adminAuth, async (req, res) => {
  try {
    const { username, password, name, realName, role, phone, email, status } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码必填' });
    const existing = await db.User.findOne({ where: { username } });
    if (existing) return res.status(400).json({ error: '用户名已存在' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await db.User.create({
      username, password: hashed,
      real_name: name || realName || '',
      role: role || 'agent',
      phone: phone || '',
      email: email || '',
      status: status || 'active',
    });
    res.json(toUserJSON(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', auth, adminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const patch = { ...req.body };
    if (patch.password) patch.password = await bcrypt.hash(patch.password, 10);
    if (patch.realName !== undefined && patch.real_name === undefined) {
      patch.real_name = patch.realName; delete patch.realName;
    }
    if (patch.name !== undefined) {
      patch.real_name = patch.real_name || patch.name; delete patch.name;
    }
    delete patch.id; delete patch.username;
    await db.User.update(patch, { where: { id } });
    const updated = await db.User.findByPk(id);
    res.json(toUserJSON(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const removed = await db.User.destroy({ where: { id } });
    if (!removed) return res.status(404).json({ error: '用户不存在' });
    res.json({ success: true, removed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/change-password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: '旧密码和新密码必填' });
    const user = await db.User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return res.status(400).json({ error: '旧密码错误' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.User.update({ password: hashed }, { where: { id: user.id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 坐席列表（下拉框用，Calls/Tickets 页面需要）
router.get('/agents/list', auth, async (req, res) => {
  try {
    const users = await db.User.findAll({
      where: { role: 'agent' },
      order: [['created_at', 'ASC']],
    });
    res.json(users.map(u => ({
      id: u.id,
      username: u.username,
      name: u.real_name || u.username,
      role: u.role,
      status: u.status,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
