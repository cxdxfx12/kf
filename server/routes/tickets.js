// 工单管理 API
const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

function toTicketJSON(t) {
  if (!t) return t;
  const raw = typeof t.toJSON === 'function' ? t.toJSON() : t;
  return {
    id: raw.id,
    title: raw.title,
    type: raw.type,
    priority: raw.priority,
    status: raw.status,
    description: raw.description,
    orderId: raw.order_id ?? raw.orderId,
    customerId: raw.customer_id ?? raw.customerId,
    createdBy: raw.created_by ?? raw.createdBy,
    assignedTo: raw.assigned_to ?? raw.assignedTo,
    resolution: raw.resolution,
    satisfaction: raw.satisfaction,
    slaMinutes: raw.sla_minutes ?? raw.slaMinutes,
    comments: raw.comments,
    createdAt: raw.created_at || raw.createdAt,
    updatedAt: raw.updated_at || raw.updatedAt,
  };
}

function toTicketCommentJSON(c) {
  if (!c) return c;
  const raw = typeof c.toJSON === 'function' ? c.toJSON() : c;
  return {
    id: raw.id,
    ticketId: raw.ticket_id ?? raw.ticketId,
    authorId: raw.author_id ?? raw.authorId,
    content: raw.content,
    type: raw.type,
    createdAt: raw.created_at || raw.createdAt,
    updatedAt: raw.updated_at || raw.updatedAt,
  };
}

router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const { status, type, priority, my } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;
    if (type && type !== 'all') where.type = type;
    if (priority && priority !== 'all') where.priority = priority;
    if (my === 'true' && req.user?.id) where.assigned_to = req.user.id;

    const priorityOrder = [
      [db.sequelize.literal(`CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`), 'ASC'],
      ['created_at', 'DESC'],
    ];
    const result = await db.paginate(db.Ticket, { page, pageSize, where, order: priorityOrder });
    const rows = result.rows.map(t => ({
      ...t,
      title: t.title,
      assignedTo: t.assigned_to,
      createdBy: t.created_by,
      customerId: t.customer_id,
      orderId: t.order_id,
      slaMinutes: t.sla_minutes,
    }));
    res.json({ ...result, rows, items: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 汇总/统计路由（固定路径必须在 /:id 之前）
router.get('/summary', auth, async (req, res) => {
  try {
    const baseWhere = req.user && req.user.role !== 'admin' && req.user.role !== 'manager'
      ? { assigned_to: req.user.id }
      : {};
    const [statusRows, priorityRows, typeRows] = await Promise.all([
      db.Ticket.findAll({
        where: baseWhere,
        attributes: ['status', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true,
      }),
      db.Ticket.findAll({
        where: baseWhere,
        attributes: ['priority', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
        group: ['priority'],
        raw: true,
      }),
      db.Ticket.findAll({
        where: baseWhere,
        attributes: ['type', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
        group: ['type'],
        raw: true,
      }),
    ]);
    res.json({
      byStatus: statusRows.map(r => ({ name: r.status, count: Number(r.count) })),
      byPriority: priorityRows.map(r => ({ name: r.priority, count: Number(r.count) })),
      byType: typeRows.map(r => ({ name: r.type, count: Number(r.count) })),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats/overview', auth, async (req, res) => {
  try {
    const baseWhere = req.user && req.user.role !== 'admin' && req.user.role !== 'manager'
      ? { assigned_to: req.user.id }
      : {};
    const [total, pending, processing, waiting, closed, urgent] = await Promise.all([
      db.Ticket.count({ where: baseWhere }),
      db.Ticket.count({ where: { ...baseWhere, status: 'open' } }),
      db.Ticket.count({ where: { ...baseWhere, status: 'processing' } }),
      db.Ticket.count({ where: { ...baseWhere, status: 'waiting' } }),
      db.Ticket.count({ where: { ...baseWhere, status: 'closed' } }),
      db.Ticket.count({ where: { ...baseWhere, priority: 'urgent', status: { [db.Op.ne]: 'closed' } } }),
    ]);
    const typeRows = await db.Ticket.findAll({
      where: baseWhere,
      attributes: ['type', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
      group: ['type'],
      raw: true,
    });
    const byType = {};
    for (const r of typeRows) byType[r.type] = Number(r.count);
    res.json({ total, pending, processing, waiting, closed, urgent, byType });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 按 ID 查询的参数路由（放在固定路径路由后面）
router.get('/:id', auth, async (req, res) => {
  try {
    const ticket = await db.Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ error: '工单不存在' });
    res.json(toTicketJSON(ticket));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/comments', auth, async (req, res) => {
  try {
    const comments = await db.TicketComment.findAll({
      where: { ticket_id: req.params.id },
      order: [['created_at', 'DESC']],
    });
    res.json(comments.map(toTicketCommentJSON));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { content, type } = req.body || {};
    if (!content) return res.status(400).json({ error: '评论内容必填' });
    const comment = await db.TicketComment.create({
      ticket_id: req.params.id,
      author_id: req.user?.id,
      content,
      type: type || 'reply',
    });
    res.json(toTicketCommentJSON(comment));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id/comments/:cid', auth, async (req, res) => {
  try {
    const removed = await db.TicketComment.destroy({ where: { id: req.params.cid, ticket_id: req.params.id } });
    if (!removed) return res.status(404).json({ error: '评论不存在' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { customerId, orderId, title, type, priority, description } = req.body || {};
    const ticket = await db.Ticket.create({
      title: title || '未命名工单',
      type: type || 'service',
      priority: priority || 'medium',
      status: 'open',
      description,
      customer_id: customerId,
      order_id: orderId,
      created_by: req.user?.id,
      assigned_to: req.user?.id,
      sla_minutes: 1440,
    });
    res.json(toTicketJSON(ticket));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body || {};
    const patch = {};
    if (body.title !== undefined) patch.title = body.title;
    if (body.type !== undefined) patch.type = body.type;
    if (body.priority !== undefined) patch.priority = body.priority;
    if (body.status !== undefined) patch.status = body.status;
    if (body.description !== undefined) patch.description = body.description;
    if (body.assignedTo !== undefined) patch.assigned_to = body.assignedTo;
    if (body.resolution !== undefined) patch.resolution = body.resolution;
    if (body.satisfaction !== undefined) patch.satisfaction = body.satisfaction;
    if (body.customerId !== undefined) patch.customer_id = body.customerId;
    if (body.orderId !== undefined) patch.order_id = body.orderId;
    if (body.slaMinutes !== undefined) patch.sla_minutes = body.slaMinutes;
    await db.Ticket.update(patch, { where: { id } });
    const updated = await db.Ticket.findByPk(id);
    res.json(toTicketJSON(updated));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/status', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, resolution, satisfaction } = req.body || {};
    const patch = {};
    if (status) patch.status = status;
    if (resolution !== undefined) patch.resolution = resolution;
    if (satisfaction !== undefined) patch.satisfaction = satisfaction;
    const ticket = await db.Ticket.findByPk(id);
    if (!ticket) return res.status(404).json({ error: '工单不存在' });
    if (req.body.assignedTo !== undefined) patch.assigned_to = req.body.assignedTo;
    else if (!ticket.assigned_to) patch.assigned_to = req.user?.id;
    await db.Ticket.update(patch, { where: { id } });
    const updated = await db.Ticket.findByPk(id);
    res.json(toTicketJSON(updated));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/assign', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { assignedTo } = req.body || {};
    await db.Ticket.update({ assigned_to: assignedTo, status: 'assigned' }, { where: { id } });
    const updated = await db.Ticket.findByPk(id);
    res.json(toTicketJSON(updated));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.TicketComment.destroy({ where: { ticket_id: id } });
    const removed = await db.Ticket.destroy({ where: { id } });
    if (!removed) return res.status(404).json({ error: '工单不存在' });
    res.json({ success: true, removed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
