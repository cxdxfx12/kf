// 快递公司 API
const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

const COURIER_LIST = [
  { id: 'sto', name: '申通快递', contact: '95543' },
  { id: 'yto', name: '圆通速递', contact: '95554' },
  { id: 'zto', name: '中通快递', contact: '95311' },
  { id: 'zjs', name: '宅急送', contact: '400-6789-000' },
  { id: 'bestexpress', name: '百世快递', contact: '95320' },
  { id: 'kuaidibird', name: '快递鸟', contact: 'https://www.kdniao.com' },
  { id: 'cainiao', name: '菜鸟开放平台', contact: 'https://open.taobao.com' },
  { id: 'jd', name: '京东物流', contact: '950616' },
  { id: 'ems', name: 'EMS', contact: '11183' },
  { id: 'dhl', name: 'DHL', contact: '95380' },
];

function isAvailable(id) {
  if (id === 'sto') return !!process.env.STO_APP_KEY;
  if (id === 'kuaidibird') return !!process.env.KUAIDI_API_KEY;
  if (id === 'cainiao') return !!process.env.CAINIAO_APP_KEY;
  return !!process.env.KUAIDI_API_KEY;
}

const PRICE_MAP = {
  sto: 8, yto: 8, zto: 8, zjs: 12, bestexpress: 10,
  jd: 10, ems: 18, dhl: 50, kuaidibird: 7, cainiao: 7,
};

router.get('/list', auth, (req, res) => {
  const list = COURIER_LIST.map(c => ({ id: c.id, name: c.name, available: isAvailable(c.id), contact: c.contact }));
  res.json(list);
});

router.post('/price', auth, (req, res) => {
  const { courier, weight = 1 } = req.body || {};
  if (!courier) return res.status(400).json({ error: 'courier 必填' });
  const base = PRICE_MAP[courier];
  if (base === undefined) return res.status(400).json({ error: `未知的快递服务商: ${courier}` });
  const w = Math.max(1, parseFloat(weight) || 1);
  res.json({ courier, price: Math.round(base * w * 100) / 100, currency: 'CNY', estimated: true });
});

module.exports = router;
