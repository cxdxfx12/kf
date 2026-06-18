// 报表 API
const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', auth, async (req, res) => {
  try {
    const [
      totalOrders,
      totalTickets,
      totalCustomers,
      totalCalls,
      pendingTickets,
      connectedCalls,
    ] = await Promise.all([
      db.Order.count(),
      db.Ticket.count(),
      db.Customer.count(),
      db.CallRecord.count(),
      db.Ticket.count({ where: { status: 'open' } }),
      db.CallRecord.count({ where: { status: 'connected' } }),
    ]);

    // 工单按类型分组
    const ticketTypeRows = await db.Ticket.findAll({
      attributes: ['type', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
      group: ['type'],
      raw: true,
    });
    const ticketByType = ticketTypeRows.map(r => ({ type: r.type, count: Number(r.count) }));

    // 订单按状态分组
    const orderStatusRows = await db.Order.findAll({
      attributes: ['status', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true,
    });
    const orderByStatus = orderStatusRows.map(r => ({ status: r.status, count: Number(r.count) }));

    // 通话趋势（近 7 天）
    const now = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const start = d;
      const end = new Date(d);
      end.setDate(end.getDate() + 1);
      const count = await db.CallRecord.count({
        where: {
          start_time: { [db.Op.gte]: start, [db.Op.lt]: end },
        },
      });
      days.push({ day: d.toISOString().slice(0, 10), count });
    }

    // 坐席绩效
    const agentRows = await db.User.findAll({
      where: { role: 'agent' },
      attributes: ['id', 'username', 'real_name', 'role', 'total_calls', 'total_tickets', 'avg_handle_time', 'satisfaction'],
      order: [['total_tickets', 'DESC']],
      limit: 10,
      raw: true,
    });
    const agents = agentRows.map(a => ({
      id: a.id,
      username: a.username,
      realName: a.real_name || a.username,
      role: a.role,
      totalCalls: a.total_calls || 0,
      totalTickets: a.total_tickets || 0,
      avgHandleTime: a.avg_handle_time || 0,
      satisfaction: a.satisfaction || 0,
    }));

    res.json({
      summary: {
        totalOrders,
        totalTickets,
        totalCustomers,
        totalCalls,
        pendingTickets,
        connectedCalls,
      },
      ticketByType,
      orderByStatus,
      callsTrend: days,
      agents,
    });
  } catch (err) {
    console.error('dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/trends/tickets', auth, async (req, res) => {
  try {
    const now = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const start = d;
      const end = new Date(d);
      end.setDate(end.getDate() + 1);
      const count = await db.Ticket.count({
        where: { created_at: { [db.Op.gte]: start, [db.Op.lt]: end } },
      });
      days.push({ day: d.toISOString().slice(0, 10), count });
    }
    res.json({ days });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/trends/calls', auth, async (req, res) => {
  try {
    const now = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const start = d;
      const end = new Date(d);
      end.setDate(end.getDate() + 1);
      const count = await db.CallRecord.count({
        where: { start_time: { [db.Op.gte]: start, [db.Op.lt]: end } },
      });
      days.push({ day: d.toISOString().slice(0, 10), count });
    }
    res.json({ days });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
