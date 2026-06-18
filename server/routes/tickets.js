// 工单管理 API
const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const { status, type, priority, my } = req.query;
  let predicate = null;
  const filter = s => (t) => {
    let match = true;
    if (status && status !== 'all') match = match && t.status === status;
    if (type && type !== 'all') match = match && t.type === type;
    if (priority && priority !== 'all') match = match && t.priority === priority;
    if (my === 'true' && s?.user?.id) match = match && t.assigneeId === s.user.id;
    return match;
  };
  predicate = filter({ user: req.user });
  const results = db.paginate('tickets', { page, pageSize, predicate, sortBy: 'priority' });
  // 把 "非常紧急" 排在前面
  const priorityOrder = { '非常紧急': 0, '紧急': 1, '一般': 2 };
  results.items = results.items.sort((a, b) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99));
  res.json(results);
});

router.get('/:id', auth, (req, res) => {
  const ticket = db.findOne('tickets', t => t.id === parseInt(req.params.id));
  if (!ticket) return res.status(404).json({ error: '工单不存在' });
  res.json(ticket);
});

router.post('/', auth, (req, res) => {
  const { customerId, customerName, customerPhone, orderNo, type, priority, subject, description } = req.body;
  const ticket = db.insert('tickets', {
    ticketNo: `TK${Date.now()}`, customerId, customerName, customerPhone, orderNo,
    type, priority: priority || '一般', subject, description, status: '待处理',
    assigneeId: req.user?.id, assigneeName: req.user?.name,
    slaDeadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  });
  // 自动分配的状态转为处理中
  if (req.user?.id) db.update('tickets', t => t.id === ticket.id, { status: '处理中' });
  res.json(db.findOne('tickets', t => t.id === ticket.id));
});

router.put('/:id', auth, (req, res) => {
  const id = parseInt(req.params.id);
  db.update('tickets', t => t.id === id, req.body);
  res.json(db.findOne('tickets', t => t.id === id));
});

router.patch('/:id/status', auth, (req, res) => {
  const id = parseInt(req.params.id);
  const current = db.findOne('tickets', t => t.id === id);
  if (!current) return res.status(404).json({ error: '工单不存在' });
  const patch = { status: req.body.status };
  if (req.body.resolution) patch.resolution = req.body.resolution;
  if (req.body.satisfaction) patch.satisfaction = req.body.satisfaction;
  if (!current.assigneeId) { patch.assigneeId = req.user.id; patch.assigneeName = req.user.name; }
  db.update('tickets', t => t.id === id, patch);
  res.json(db.findOne('tickets', t => t.id === id));
});

router.patch('/:id/assign', auth, (req, res) => {
  const id = parseInt(req.params.id);
  db.update('tickets', t => t.id === id, { assigneeId: req.body.assigneeId, assigneeName: req.body.assigneeName, status: '处理中' });
  res.json(db.findOne('tickets', t => t.id === id));
});

router.get('/stats/overview', auth, (req, res) => {
  const tickets = db.getAll('tickets');
  const filterByMe = t => req.user.role === 'agent' ? t.assigneeId === req.user.id : true;
  const mine = tickets.filter(filterByMe);
  const byType = {};
  for (const t of ['查询', '催件', '投诉', '改址', '退款', '其他']) {
    byType[t] = mine.filter(x => x.type === t).length;
  }
  res.json({
    total: mine.length, pending: mine.filter(t => t.status === '待处理').length,
    processing: mine.filter(t => t.status === '处理中').length,
    waiting: mine.filter(t => t.status === '待回访').length,
    closed: mine.filter(t => t.status === '已关闭').length,
    urgent: mine.filter(t => t.priority === '非常紧急' && t.status !== '已关闭').length,
    byType,
  });
});

module.exports = router;
