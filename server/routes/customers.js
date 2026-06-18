// 客户管理 API
const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/search', auth, (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  if (!q) return res.json([]);
  const results = db.findMany('customers', c =>
    (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q)
  ).slice(0, 20);
  res.json(results);
});

router.get('/screenpop', auth, (req, res) => {
  const phone = String(req.query.phone || '');
  if (!phone) return res.status(400).json({ error: '请提供手机号' });
  const customer = db.findOne('customers', c => c.phone === phone);
  if (!customer) return res.json({ isNew: true, customer: null, recentOrders: [], recentTickets: [], recentCalls: [] });
  const recentOrders = db.findMany('orders', o => o.customerId === customer.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const recentTickets = db.findMany('tickets', t => t.customerId === customer.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const recentCalls = db.findMany('calls', c => c.customerId === customer.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  res.json({ isNew: false, customer, recentOrders, recentTickets, recentCalls });
});

router.get('/:id', auth, (req, res) => {
  const id = parseInt(req.params.id);
  const customer = db.findOne('customers', c => c.id === id);
  if (!customer) return res.status(404).json({ error: '客户不存在' });
  const orders = db.findMany('orders', o => o.customerId === id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20);
  const tickets = db.findMany('tickets', t => t.customerId === id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20);
  const calls = db.findMany('calls', c => c.customerId === id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20);
  res.json({ customer, orders, tickets, calls });
});

router.post('/', auth, (req, res) => {
  const customer = db.insert('customers', { ...req.body });
  res.json(customer);
});

router.put('/:id', auth, (req, res) => {
  const id = parseInt(req.params.id);
  db.update('customers', c => c.id === id, req.body);
  res.json(db.findOne('customers', c => c.id === id));
});

router.get('/', auth, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const results = db.paginate('customers', { page, pageSize });
  res.json(results);
});

module.exports = router;
