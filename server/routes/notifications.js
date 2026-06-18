const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const baseWhere = userRole !== 'admin' && userRole !== 'manager'
      ? { assigned_to: userId, status: { [db.Op.in]: ['open', 'assigned', 'processing', 'waiting'] } }
      : { status: { [db.Op.in]: ['open', 'assigned', 'processing', 'waiting'] } };

    const pendingTickets = await db.Ticket.count({ where: baseWhere });
    const urgentTickets = await db.Ticket.count({
      where: {
        ...baseWhere,
        priority: 'urgent',
        status: { [db.Op.ne]: 'closed' }
      }
    });

    const [todayTickets, todayCalls] = await Promise.all([
      db.Ticket.count({
        where: {
          created_at: {
            [db.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      db.CallRecord.count({
        where: {
          created_at: {
            [db.Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    const notifications = [];
    if (urgentTickets > 0) {
      notifications.push({
        id: 'urgent',
        type: 'urgent',
        title: '紧急工单',
        message: `您有 ${urgentTickets} 个紧急工单待处理`,
        count: urgentTickets,
        createdAt: new Date().toISOString()
      });
    }
    if (todayTickets > 0) {
      notifications.push({
        id: 'today_tickets',
        type: 'info',
        title: '今日工单',
        message: `今日新增 ${todayTickets} 个工单`,
        count: todayTickets,
        createdAt: new Date().toISOString()
      });
    }
    if (todayCalls > 0) {
      notifications.push({
        id: 'today_calls',
        type: 'info',
        title: '今日通话',
        message: `今日已接 ${todayCalls} 通电话`,
        count: todayCalls,
        createdAt: new Date().toISOString()
      });
    }

    res.json({
      pendingTickets,
      notificationCount: notifications.length,
      notifications,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Notifications API Error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/badge', auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const baseWhere = userRole !== 'admin' && userRole !== 'manager'
      ? { assigned_to: userId, status: { [db.Op.in]: ['open', 'assigned', 'processing', 'waiting'] } }
      : { status: { [db.Op.in]: ['open', 'assigned', 'processing', 'waiting'] } };

    const pendingTickets = await db.Ticket.count({ where: baseWhere });

    const urgentTickets = await db.Ticket.count({
      where: {
        ...baseWhere,
        priority: 'urgent',
        status: { [db.Op.ne]: 'closed' }
      }
    });

    const notificationCount = urgentTickets > 0 ? 1 : 0;

    res.json({
      ticketBadge: pendingTickets,
      notificationBadge: notificationCount,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Notifications Badge API Error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
