import { Router, Request, Response } from 'express';
import { Op, fn, col, literal } from 'sequelize';
import { Ticket, CallRecord, Order, Customer, User } from '../models';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/dashboard', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const totalOrders = await Order.count();
    const totalTickets = await Ticket.count();
    const totalCustomers = await Customer.count();
    const totalCalls = await CallRecord.count();
    const pendingTickets = await Ticket.count({ where: { status: { [Op.in]: ['open', 'assigned', 'processing'] } } });
    const connectedCalls = await CallRecord.count({ where: { status: 'connected', startTime: { [Op.gte]: today } } });
    const deliveredOrders = await Order.count({ where: { status: 'delivered' } });

    const ticketByType: any[] = await Ticket.findAll({
      attributes: ['type', [fn('COUNT', col('id')), 'count']],
      group: ['type'], raw: true,
    });
    const orderByStatus: any[] = await Order.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'], raw: true,
    });
    const callsTrend: any[] = await CallRecord.findAll({
      attributes: [[literal('DATE(start_time)'), 'day'], [fn('COUNT', col('id')), 'count']],
      where: { startTime: { [Op.gte]: new Date(Date.now() - 7 * 86400000) } },
      group: [literal('DATE(start_time)')],
      order: [[literal('DATE(start_time)'), 'ASC']], raw: true,
    });
    const agents = await User.findAll({ where: { status: 'active' }, attributes: ['id', 'realName', 'totalCalls', 'totalTickets', 'avgHandleTime', 'satisfaction'], raw: true });

    res.json({
      summary: { totalOrders, totalTickets, totalCustomers, totalCalls, pendingTickets, connectedCalls, deliveredOrders },
      ticketByType, orderByStatus, callsTrend,
      agents,
    });
  } catch (err) {
    res.status(500).json({ error: '查询失败', detail: (err as any).message });
  }
});

router.get('/tickets/summary', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const byStatus = await Ticket.findAll({ attributes: ['status', [fn('COUNT', col('id')), 'count']], group: ['status'], raw: true });
    const byPriority = await Ticket.findAll({ attributes: ['priority', [fn('COUNT', col('id')), 'count']], group: ['priority'], raw: true });
    const byType = await Ticket.findAll({ attributes: ['type', [fn('COUNT', col('id')), 'count']], group: ['type'], raw: true });
    const avgSatisfactionRow: any = await Ticket.findOne({ attributes: [[fn('AVG', col('satisfaction')), 'avg']], raw: true });
    res.json({ byStatus, byPriority, byType, avgSatisfaction: Number(avgSatisfactionRow?.avg || 0) });
  } catch (err) { res.status(500).json({ error: '查询失败', detail: (err as any).message }); }
});

router.get('/orders/summary', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const byStatus = await Order.findAll({ attributes: ['status', [fn('COUNT', col('id')), 'count']], group: ['status'], raw: true });
    const byCourier = await Order.findAll({ attributes: ['courier', [fn('COUNT', col('id')), 'count']], group: ['courier'], raw: true });
    res.json({ byStatus, byCourier });
  } catch (err) { res.status(500).json({ error: '查询失败', detail: (err as any).message }); }
});

export default router;
