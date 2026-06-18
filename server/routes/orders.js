// 订单管理 API
const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

function toOrderJSON(o) {
  if (!o) return o;
  const raw = typeof o.toJSON === 'function' ? o.toJSON() : o;
  return {
    id: raw.id,
    trackingNumber: raw.tracking_number || raw.trackingNumber,
    courier: raw.courier,
    senderName: raw.sender_name || raw.senderName,
    senderPhone: raw.sender_phone || raw.senderPhone,
    senderAddress: raw.sender_address || raw.senderAddress,
    receiverName: raw.receiver_name || raw.receiverName,
    receiverPhone: raw.receiver_phone || raw.receiverPhone,
    receiverAddress: raw.receiver_address || raw.receiverAddress,
    weight: raw.weight,
    status: raw.status,
    estimatedDelivery: raw.estimated_delivery || raw.estimatedDelivery,
    actualDelivery: raw.actual_delivery || raw.actualDelivery,
    trackingInfo: raw.tracking_info || raw.trackingInfo,
    customerId: raw.customer_id ?? raw.customerId,
    createdBy: raw.created_by ?? raw.createdBy,
    createdAt: raw.created_at || raw.createdAt,
    updatedAt: raw.updated_at || raw.updatedAt,
  };
}

router.get('/search', auth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json([]);
    const { Op } = db;
    const results = await db.Order.findAll({
      where: {
        [Op.or]: [
          { tracking_number: { [Op.like]: `%${q}%` } },
          { receiver_phone: { [Op.like]: `%${q}%` } },
          { receiver_name: { [Op.like]: `%${q}%` } },
        ],
      },
      limit: 30,
      order: [['created_at', 'DESC']],
    });
    res.json(results.map(toOrderJSON));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const { status, courier } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;
    if (courier && courier !== 'all') where.courier = courier;
    const result = await db.paginate(db.Order, { page, pageSize, where, order: [['created_at', 'DESC']] });
    const rows = result.rows.map(o => ({
      ...o,
      trackingNumber: o.tracking_number || o.trackingNumber,
    }));
    res.json({ ...result, rows, items: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/summary', auth, async (req, res) => {
  try {
    const statusRows = await db.Order.findAll({
      attributes: ['status', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true,
    });
    const courierRows = await db.Order.findAll({
      attributes: ['courier', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
      group: ['courier'],
      raw: true,
    });
    res.json({
      byStatus: statusRows.map(r => ({ status: r.status, count: Number(r.count) })),
      byCourier: courierRows.map(r => ({ courier: r.courier || 'unknown', count: Number(r.count) })),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/track/:trackingNumber', auth, async (req, res) => {
  try {
    const order = await db.Order.findOne({ where: { tracking_number: req.params.trackingNumber } });
    if (!order) return res.status(404).json({ error: '未找到该快递单号' });
    const parsed = toOrderJSON(order);
    let tracking = [];
    try {
      if (parsed.trackingInfo) {
        tracking = typeof parsed.trackingInfo === 'string' ? JSON.parse(parsed.trackingInfo) : parsed.trackingInfo;
      }
    } catch (_) { tracking = []; }
    res.json({
      trackingNumber: parsed.trackingNumber,
      courier: parsed.courier,
      status: parsed.status,
      receiver: { name: parsed.receiverName, phone: parsed.receiverPhone, address: parsed.receiverAddress },
      tracking,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const order = await db.Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: '订单不存在' });
    res.json(toOrderJSON(order));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const body = req.body || {};
    const payload = {
      tracking_number: body.trackingNumber || body.tracking_number,
      courier: body.courier,
      sender_name: body.senderName || body.sender_name,
      sender_phone: body.senderPhone || body.sender_phone,
      sender_address: body.senderAddress || body.sender_address,
      receiver_name: body.receiverName || body.receiver_name,
      receiver_phone: body.receiverPhone || body.receiver_phone,
      receiver_address: body.receiverAddress || body.receiver_address,
      weight: body.weight,
      status: body.status || 'pending',
      estimated_delivery: body.estimatedDelivery || body.estimated_delivery,
      tracking_info: body.trackingInfo || body.tracking_info,
      customer_id: body.customerId ?? body.customer_id,
      created_by: body.createdBy ?? body.created_by ?? (req.user?.id),
    };
    const order = await db.Order.create(payload);
    res.json(toOrderJSON(order));
  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeUniqueConstraintError') return res.status(400).json({ error: '快递单号已存在' });
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/status', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body || {};
    await db.Order.update({ status }, { where: { id } });
    const updated = await db.Order.findByPk(id);
    res.json(toOrderJSON(updated));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body || {};
    const patch = {};
    if (body.trackingNumber !== undefined) patch.tracking_number = body.trackingNumber;
    if (body.courier !== undefined) patch.courier = body.courier;
    if (body.senderName !== undefined) patch.sender_name = body.senderName;
    if (body.senderPhone !== undefined) patch.sender_phone = body.senderPhone;
    if (body.senderAddress !== undefined) patch.sender_address = body.senderAddress;
    if (body.receiverName !== undefined) patch.receiver_name = body.receiverName;
    if (body.receiverPhone !== undefined) patch.receiver_phone = body.receiverPhone;
    if (body.receiverAddress !== undefined) patch.receiver_address = body.receiverAddress;
    if (body.weight !== undefined) patch.weight = body.weight;
    if (body.status !== undefined) patch.status = body.status;
    if (body.estimatedDelivery !== undefined) patch.estimated_delivery = body.estimatedDelivery;
    if (body.actualDelivery !== undefined) patch.actual_delivery = body.actualDelivery;
    if (body.trackingInfo !== undefined) patch.tracking_info = body.trackingInfo;
    if (body.customerId !== undefined) patch.customer_id = body.customerId;
    await db.Order.update(patch, { where: { id } });
    const updated = await db.Order.findByPk(id);
    res.json(toOrderJSON(updated));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const removed = await db.Order.destroy({ where: { id } });
    if (!removed) return res.status(404).json({ error: '订单不存在' });
    res.json({ success: true, removed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats/overview', auth, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [total, todayCount, transit, abnormal] = await Promise.all([
      db.Order.count(),
      db.Order.count({ where: { created_at: { [db.Op.gte]: today } } }),
      db.Order.count({ where: { status: { [db.Op.in]: ['transit', 'delivery', 'collected'] } } }),
      db.Order.count({ where: { status: 'exception' } }),
    ]);
    const courierRows = await db.Order.findAll({
      attributes: ['courier', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
      group: ['courier'],
      raw: true,
    });
    const byCourier = {};
    for (const r of courierRows) byCourier[r.courier || 'unknown'] = Number(r.count);
    res.json({ total, today: todayCount, inTransit: transit, abnormal, byCourier });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
