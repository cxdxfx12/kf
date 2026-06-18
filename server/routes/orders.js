// 订单管理 API
const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/search', auth, (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  if (!q) return res.json([]);
  const results = db.findMany('orders', o =>
    (o.orderNo || '').toLowerCase().includes(q) ||
    (o.customerPhone || '').toLowerCase().includes(q) ||
    (o.receiverName || '').toLowerCase().includes(q)
  ).slice(0, 30);
  res.json(results);
});

router.get('/', auth, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const { status, courier } = req.query;
  let predicate = null;
  if (status && status !== 'all' || courier && courier !== 'all') {
    predicate = o =>
      (!status || status === 'all' || o.status === status) &&
      (!courier || courier === 'all' || o.courier === courier);
  }
  const results = db.paginate('orders', { page, pageSize, predicate });
  res.json(results);
});

router.get('/track/:orderNo', auth, (req, res) => {
  const order = db.findOne('orders', o => o.orderNo === req.params.orderNo);
  if (!order) return res.status(404).json({ error: '未找到该快递单号' });
  const ctime = new Date(order.createdAt);
  const tracking = [
    { time: new Date(ctime.getTime() + 3600000 * 24).toLocaleString('zh-CN'), status: '【快件派送】', location: order.receiverAddress, detail: '派送员正在为您派送' },
    { time: new Date(ctime.getTime() + 3600000 * 18).toLocaleString('zh-CN'), status: '【到达派送点】', location: order.currentLocation || '当地网点', detail: '快件已到达目的地派送站' },
    { time: new Date(ctime.getTime() + 3600000 * 6).toLocaleString('zh-CN'), status: '【运输中转】', location: `${order.currentLocation || '中转中心'} 中转站`, detail: '快件正在中转运输' },
    { time: new Date(ctime.getTime() + 3600000).toLocaleString('zh-CN'), status: '【快件已揽收】', location: order.currentLocation || '始发地', detail: `快递员已揽收，快递单号 ${order.orderNo}` },
  ];
  res.json({
    orderNo: order.orderNo, courier: order.courier, status: order.status,
    receiver: { name: order.receiverName, phone: order.receiverPhone, address: order.receiverAddress },
    tracking,
  });
});

router.post('/', auth, (req, res) => {
  const order = db.insert('orders', { ...req.body });
  res.json(order);
});

router.patch('/:id/status', auth, (req, res) => {
  const id = parseInt(req.params.id);
  db.update('orders', o => o.id === id, { status: req.body.status });
  res.json(db.findOne('orders', o => o.id === id));
});

router.get('/stats/overview', auth, (req, res) => {
  const orders = db.getAll('orders');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const byCourier = {};
  for (const c of ['圆通', '中通', '申通', '百世', '韵达', '顺丰', 'EMS']) {
    byCourier[c] = orders.filter(o => o.courier === c).length;
  }
  res.json({
    total: orders.length,
    today: orders.filter(o => new Date(o.createdAt) >= today).length,
    inTransit: orders.filter(o => ['运输中', '派送中'].includes(o.status)).length,
    abnormal: orders.filter(o => o.status === '异常').length,
    byCourier,
  });
});

module.exports = router;
