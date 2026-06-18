// 通话记录 API
const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

function toCallJSON(c) {
  if (!c) return c;
  const raw = typeof c.toJSON === 'function' ? c.toJSON() : c;
  return {
    id: raw.id,
    direction: raw.direction,
    customerPhone: raw.customer_phone || raw.customerPhone,
    customerName: raw.customer_name || raw.customerName,
    agentId: raw.agent_id ?? raw.agentId,
    status: raw.status,
    startTime: raw.start_time || raw.startTime,
    endTime: raw.end_time || raw.endTime,
    duration: raw.duration,
    recordingUrl: raw.recording_url || raw.recordingUrl,
    callId: raw.call_id || raw.callId,
    notes: raw.notes,
    ticketId: raw.ticket_id ?? raw.ticketId,
    customerId: raw.customer_id ?? raw.customerId,
    createdAt: raw.created_at || raw.createdAt,
    updatedAt: raw.updated_at || raw.updatedAt,
  };
}

router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const { status, direction, my } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;
    if (direction && direction !== 'all') where.direction = direction;
    if (my === 'true' && req.user?.id) where.agent_id = req.user.id;
    const result = await db.paginate(db.CallRecord, { page, pageSize, where, order: [['created_at', 'DESC']] });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 汇总/统计路由（固定路径必须在 /:id 之前）
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const baseWhere = req.user && req.user.role !== 'admin' && req.user.role !== 'manager'
      ? { agent_id: req.user.id }
      : {};
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [total, todayCount, connected, missed, inbound, outbound] = await Promise.all([
      db.CallRecord.count({ where: baseWhere }),
      db.CallRecord.count({ where: { ...baseWhere, created_at: { [db.Op.gte]: today } } }),
      db.CallRecord.count({ where: { ...baseWhere, status: 'connected' } }),
      db.CallRecord.count({ where: { ...baseWhere, status: 'missed' } }),
      db.CallRecord.count({ where: { ...baseWhere, direction: 'inbound' } }),
      db.CallRecord.count({ where: { ...baseWhere, direction: 'outbound' } }),
    ]);
    const connectedRows = await db.CallRecord.findAll({
      where: { ...baseWhere, status: 'connected' },
      attributes: [[db.sequelize.fn('SUM', db.sequelize.col('duration')), 'total']],
      raw: true,
    });
    const totalDuration = Number(connectedRows[0]?.total || 0);
    const avgDuration = connected > 0 ? Math.round(totalDuration / connected) : 0;
    res.json({ total, today: todayCount, connected, missed, inbound, outbound, totalDuration, avgDuration });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats/overview', auth, async (req, res) => {
  try {
    const baseWhere = req.user && req.user.role !== 'admin' && req.user.role !== 'manager'
      ? { agent_id: req.user.id }
      : {};
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [total, todayCount, connected, missed, inbound, outbound] = await Promise.all([
      db.CallRecord.count({ where: baseWhere }),
      db.CallRecord.count({ where: { ...baseWhere, created_at: { [db.Op.gte]: today } } }),
      db.CallRecord.count({ where: { ...baseWhere, status: 'connected' } }),
      db.CallRecord.count({ where: { ...baseWhere, status: 'missed' } }),
      db.CallRecord.count({ where: { ...baseWhere, direction: 'inbound' } }),
      db.CallRecord.count({ where: { ...baseWhere, direction: 'outbound' } }),
    ]);
    const connectedRows = await db.CallRecord.findAll({
      where: { ...baseWhere, status: 'connected' },
      attributes: [[db.sequelize.fn('SUM', db.sequelize.col('duration')), 'total']],
      raw: true,
    });
    const totalDuration = Number(connectedRows[0]?.total || 0);
    const avgDuration = connected > 0 ? Math.round(totalDuration / connected) : 0;
    res.json({ total, today: todayCount, connected, missed, inbound, outbound, avgDuration });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const c = await db.CallRecord.findByPk(req.params.id);
    if (!c) return res.status(404).json({ error: '记录不存在' });
    res.json(toCallJSON(c));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const body = req.body || {};
    const payload = {
      direction: body.direction || 'inbound',
      customer_phone: body.customerPhone || body.customer_phone,
      customer_name: body.customerName || body.customer_name,
      agent_id: body.agentId ?? body.agent_id ?? req.user?.id,
      status: body.status || 'connected',
      start_time: body.startTime || body.start_time,
      end_time: body.endTime || body.end_time,
      duration: body.duration ?? 0,
      recording_url: body.recordingUrl || body.recording_url,
      call_id: body.callId || body.call_id,
      notes: body.notes,
      ticket_id: body.ticketId ?? body.ticket_id,
      customer_id: body.customerId ?? body.customer_id,
    };
    const call = await db.CallRecord.create(payload);
    res.json(toCallJSON(call));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body || {};
    const patch = {};
    if (body.direction !== undefined) patch.direction = body.direction;
    if (body.customerPhone !== undefined) patch.customer_phone = body.customerPhone;
    if (body.customerName !== undefined) patch.customer_name = body.customerName;
    if (body.agentId !== undefined) patch.agent_id = body.agentId;
    if (body.status !== undefined) patch.status = body.status;
    if (body.startTime !== undefined) patch.start_time = body.startTime;
    if (body.endTime !== undefined) patch.end_time = body.endTime;
    if (body.duration !== undefined) patch.duration = body.duration;
    if (body.notes !== undefined) patch.notes = body.notes;
    if (body.ticketId !== undefined) patch.ticket_id = body.ticketId;
    await db.CallRecord.update(patch, { where: { id } });
    const updated = await db.CallRecord.findByPk(id);
    res.json(toCallJSON(updated));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const removed = await db.CallRecord.destroy({ where: { id } });
    if (!removed) return res.status(404).json({ error: '记录不存在' });
    res.json({ success: true, removed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
