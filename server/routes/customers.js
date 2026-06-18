// 客户管理 API
const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

function toCustomerJSON(c) {
  if (!c) return c;
  const raw = typeof c.toJSON === 'function' ? c.toJSON() : c;
  return {
    id: raw.id,
    name: raw.name,
    phone: raw.phone,
    address: raw.address,
    email: raw.email,
    tags: raw.tags,
    vip: !!raw.vip,
    totalOrders: raw.total_orders ?? raw.totalOrders ?? 0,
    totalTickets: raw.total_tickets ?? raw.totalTickets ?? 0,
    lastContact: raw.last_contact || raw.lastContact,
    notes: raw.notes,
    createdAt: raw.created_at || raw.createdAt,
    updatedAt: raw.updated_at || raw.updatedAt,
  };
}

router.get('/search', auth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json([]);
    const { Op } = db;
    const results = await db.Customer.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${q}%` } },
          { phone: { [Op.like]: `%${q}%` } },
        ],
      },
      limit: 20,
    });
    res.json(results.map(toCustomerJSON));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/screenpop', auth, async (req, res) => {
  try {
    const phone = String(req.query.phone || '').trim();
    if (!phone) return res.status(400).json({ error: '请提供手机号' });
    const customer = await db.Customer.findOne({ where: { phone } });
    if (!customer) return res.json({ isNew: true, customer: null, recentOrders: [], recentTickets: [], recentCalls: [] });
    const recentOrders = await db.Order.findAll({ where: { customer_id: customer.id }, order: [['created_at', 'DESC']], limit: 5 });
    const recentTickets = await db.Ticket.findAll({ where: { customer_id: customer.id }, order: [['created_at', 'DESC']], limit: 5 });
    const recentCalls = await db.CallRecord.findAll({ where: { customer_id: customer.id }, order: [['created_at', 'DESC']], limit: 5 });
    res.json({
      isNew: false,
      customer: toCustomerJSON(customer),
      recentOrders: recentOrders.map(db.toPlain),
      recentTickets: recentTickets.map(db.toPlain),
      recentCalls: recentCalls.map(db.toPlain),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const customer = await db.Customer.findByPk(id);
    if (!customer) return res.status(404).json({ error: '客户不存在' });
    const orders = await db.Order.findAll({ where: { customer_id: id }, order: [['created_at', 'DESC']], limit: 20 });
    const tickets = await db.Ticket.findAll({ where: { customer_id: id }, order: [['created_at', 'DESC']], limit: 20 });
    const calls = await db.CallRecord.findAll({ where: { customer_id: id }, order: [['created_at', 'DESC']], limit: 20 });
    res.json({
      customer: toCustomerJSON(customer),
      orders: orders.map(db.toPlain),
      tickets: tickets.map(db.toPlain),
      calls: calls.map(db.toPlain),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, phone, address, email, tags, vip, notes } = req.body || {};
    if (!name || !phone) return res.status(400).json({ error: '姓名和手机号必填' });
    const customer = await db.Customer.create({
      name, phone, address, email, tags,
      vip: vip ? 1 : 0, notes,
    });
    res.json(toCustomerJSON(customer));
  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeUniqueConstraintError') return res.status(400).json({ error: '手机号已存在' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const patch = { ...req.body };
    if (patch.vip !== undefined) patch.vip = patch.vip ? 1 : 0;
    delete patch.id;
    await db.Customer.update(patch, { where: { id } });
    const updated = await db.Customer.findByPk(id);
    res.json(toCustomerJSON(updated));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const removed = await db.Customer.destroy({ where: { id } });
    if (!removed) return res.status(404).json({ error: '客户不存在' });
    res.json({ success: true, removed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const result = await db.paginate(db.Customer, { page, pageSize, order: [['created_at', 'DESC']] });
    res.json({ ...result, rows: result.rows.map(toCustomerJSON), items: result.items.map(toCustomerJSON) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
