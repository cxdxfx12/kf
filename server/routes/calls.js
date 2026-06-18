// 通话记录 API
const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const { status, direction, my } = req.query;
  let predicate = null;
  predicate = c => {
    let match = true;
    if (status && status !== 'all') match = match && c.status === status;
    if (direction && direction !== 'all') match = match && c.direction === direction;
    if (my === 'true' && req.user) match = match && c.agentId === req.user.id;
    return match;
  };
  const results = db.paginate('calls', { page, pageSize, predicate });
  res.json(results);
});

router.get('/:id', auth, (req, res) => {
  const call = db.findOne('calls', c => c.id === parseInt(req.params.id));
  if (!call) return res.status(404).json({ error: '记录不存在' });
  res.json(call);
});

router.get('/stats/overview', auth, (req, res) => {
  const calls = db.getAll('calls');
  const filterByMe = c => req.user.role === 'agent' ? c.agentId === req.user.id : true;
  const mine = calls.filter(filterByMe);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const connected = mine.filter(c => ['connected', 'ended'].includes(c.status));
  const avgDuration = connected.length > 0 ? Math.round(connected.reduce((sum, c) => sum + (c.duration || 0), 0) / connected.length) : 0;
  res.json({
    total: mine.length, today: mine.filter(c => new Date(c.createdAt) >= today).length,
    connected: connected.length, missed: mine.filter(c => c.status === 'missed').length,
    inbound: mine.filter(c => c.direction === 'inbound').length,
    outbound: mine.filter(c => c.direction === 'outbound').length,
    avgDuration,
  });
});

module.exports = router;
