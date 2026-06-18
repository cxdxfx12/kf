// 数据报表 API
const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', auth, (req, res) => {
  const orders = db.getAll('orders');
  const tickets = db.getAll('tickets');
  const calls = db.getAll('calls');
  const users = db.getAll('users');

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const orderTrend = [];
  const ticketTrend = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(today.getTime() - i * 24 * 3600 * 1000);
    const next = new Date(day.getTime() + 24 * 3600 * 1000);
    orderTrend.push({ date: `${day.getMonth() + 1}/${day.getDate()}`, count: orders.filter(o => new Date(o.createdAt) >= day && new Date(o.createdAt) < next).length });
    ticketTrend.push({ date: `${day.getMonth() + 1}/${day.getDate()}`, count: tickets.filter(t => new Date(t.createdAt) >= day && new Date(t.createdAt) < next).length });
  }
  const courierStats = [];
  for (const c of ['圆通', '中通', '申通', '百世', '韵达', '顺丰', 'EMS']) {
    courierStats.push({ name: c, value: orders.filter(o => o.courier === c).length });
  }
  const todoTickets = tickets.filter(t => ['待处理', '处理中'].includes(t.status) && (t.priority === '非常紧急' || (t.slaDeadline && new Date(t.slaDeadline) < new Date(Date.now() + 2 * 3600 * 1000))));
  const priorityOrder = { '非常紧急': 0, '紧急': 1, '一般': 2 };
  todoTickets.sort((a, b) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99));

  res.json({
    orders: {
      total: orders.length, today: orders.filter(o => new Date(o.createdAt) >= today).length,
      inTransit: orders.filter(o => ['运输中', '派送中'].includes(o.status)).length,
      abnormal: orders.filter(o => o.status === '异常').length,
    },
    tickets: {
      total: tickets.length, pending: tickets.filter(t => t.status === '待处理').length,
      processing: tickets.filter(t => t.status === '处理中').length,
      closed: tickets.filter(t => t.status === '已关闭').length,
      urgent: tickets.filter(t => t.priority === '非常紧急' && t.status !== '已关闭').length,
      slaWarning: tickets.filter(t => ['待处理', '处理中'].includes(t.status) && t.slaDeadline && new Date(t.slaDeadline) < new Date(Date.now() + 2 * 3600 * 1000)).length,
    },
    calls: {
      total: calls.length, today: calls.filter(c => new Date(c.createdAt) >= today).length,
      missed: calls.filter(c => c.status === 'missed').length,
    },
    agents: {
      online: users.filter(u => u.status === 'online').length,
      busy: users.filter(u => u.status === 'busy').length,
      offline: users.filter(u => u.status === 'offline').length,
    },
    orderTrend, ticketTrend, courierStats,
    todoTickets: todoTickets.slice(0, 15),
    recentCalls: calls.filter(c => ['missed', 'ringing'].includes(c.status)).slice(0, 10),
  });
});

router.get('/agent-performance', auth, (req, res) => {
  const users = db.getAll('users').filter(u => u.role === 'agent');
  const stats = users.map(u => {
    const tickets = db.count('tickets', t => t.assigneeId === u.id && t.status === '已关闭');
    const calls = db.count('calls', c => c.agentId === u.id);
    const connected = db.findMany('calls', c => c.agentId === u.id && ['connected', 'ended'].includes(c.status));
    const totalDuration = connected.reduce((s, c) => s + (c.duration || 0), 0);
    return { id: u.id, name: u.name, status: u.status, tickets, calls, totalDuration, avgDuration: connected.length > 0 ? Math.round(totalDuration / connected.length) : 0 };
  });
  stats.sort((a, b) => b.tickets - a.tickets);
  res.json(stats);
});

module.exports = router;
