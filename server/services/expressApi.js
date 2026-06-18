// 快递 API 对接模拟层 - 模拟菜鸟网络 / 快递鸟接口
const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 快递鸟 API - 物流轨迹查询
router.get('/kdn/track', auth, (req, res) => {
  const { orderNo } = req.query;
  const orders = db.getAll('orders');
  const matched = orderNo
    ? orders.filter(o => o.orderNo.includes(orderNo)).slice(0, 10)
    : orders.slice(0, 5);
  const result = matched.map(o => {
    const t = new Date(o.createdAt);
    return {
      orderNo: o.orderNo, courier: o.courier, status: o.status,
      shipper: { name: o.receiverName, phone: o.receiverPhone, address: o.receiverAddress },
      traces: [
        { time: new Date(t.getTime() + 3600000 * 28).toLocaleString('zh-CN'), status: '【签收】', location: o.receiverAddress, detail: o.status === '已签收' ? '客户本人签收' : '等待派送中' },
        { time: new Date(t.getTime() + 3600000 * 20).toLocaleString('zh-CN'), status: '【派送】', location: o.currentLocation || '派送点', detail: '快件正在派送中' },
        { time: new Date(t.getTime() + 3600000 * 12).toLocaleString('zh-CN'), status: '【中转】', location: '运输途中', detail: '快件到达中转中心' },
        { time: new Date(t.getTime() + 3600000 * 3).toLocaleString('zh-CN'), status: '【揽收】', location: o.currentLocation || '始发地', detail: `${o.courier} 已揽收` },
      ],
    };
  });
  res.json({ success: true, code: 200, result });
});

// 菜鸟 API - 电子面单
router.post('/cainiao/waybill', auth, (req, res) => {
  const { sender, receiver, items, courier } = req.body;
  const orderNo = `${(courier || '圆通').substring(0, 1)}${Date.now()}`;
  res.json({ success: true, orderNo, courier: courier || '圆通', waybillCode: orderNo, printData: { sender, receiver, items, weight: Math.round(Math.random() * 100) / 10, timestamp: new Date().toLocaleString('zh-CN') }, qrCode: `https://example.com/track/${orderNo}` });
});

// 快递公司列表
router.get('/couriers', auth, (req, res) => {
  res.json({
    couriers: [
      { code: 'YTO', name: '圆通速递', support: ['track', 'waybill', 'subscribe'] },
      { code: 'ZTO', name: '中通快递', support: ['track', 'waybill', 'subscribe'] },
      { code: 'STO', name: '申通快递', support: ['track', 'waybill'] },
      { code: 'HTKY', name: '百世快递', support: ['track', 'waybill', 'subscribe'] },
      { code: 'YD', name: '韵达速递', support: ['track', 'waybill', 'subscribe'] },
      { code: 'SF', name: '顺丰速运', support: ['track', 'waybill', 'subscribe', 'predict'] },
      { code: 'EMS', name: 'EMS', support: ['track', 'waybill'] },
    ],
  });
});

// 订阅物流状态变化
router.post('/subscribe', auth, (req, res) => {
  res.json({ success: true, subscriptionId: `SUB${Date.now()}`, orderNo: req.body.orderNo, callbackUrl: req.body.callbackUrl, message: '已订阅，物流状态变更时将自动推送' });
});

// 送达时间预估
router.get('/predict', auth, (req, res) => {
  const hours = Math.floor(Math.random() * 24) + 24;
  const eta = new Date(Date.now() + hours * 3600 * 1000);
  res.json({ from: req.query.from || '北京', to: req.query.to || '上海', hours, estimatedDelivery: eta.toLocaleString('zh-CN'), probability: 0.92, carrier: '圆通' });
});

module.exports = router;
