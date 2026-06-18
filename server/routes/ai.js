// AI 智能助手 API
const express = require('express');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 智能话术建议
router.post('/suggest', auth, (req, res) => {
  const { context, ticketType, ticketSubject } = req.body;
  const suggestions = {
    '查询': [
      '您好，请问您需要查询什么问题？请提供快递单号，我将为您核实。',
      '您的订单当前状态是运输中，预计今日送达，请您保持电话畅通。',
      '已为您查询到最新物流信息，请您稍等我为您详细说明。',
    ],
    '催件': [
      '非常抱歉让您久等了，我立即为您联系派送点核实情况。',
      '已为您标记加急，派送员会优先处理，预计今天会送达。',
      '我帮您联系了当地网点，对方反馈将在2小时内送达。',
    ],
    '投诉': [
      '非常抱歉给您带来了不好的体验，我们非常重视您的反馈。',
      '您的投诉已记录，我们会在2小时内由专人跟进处理。',
      '请您详细描述一下遇到的问题，以便我们更好地处理。',
    ],
    '改址': [
      '可以修改地址的，请您提供一下新的收件地址和收件人电话。',
      '已为您修改收件地址，新地址已更新到系统中，请您确认一下。',
      '由于快件还未发出，可以修改地址，请您放心。',
    ],
    '退款': [
      '关于退款问题，我帮您查询一下订单状态。',
      '已为您办理退款，预计1-3个工作日到账。',
      '退款已受理，请耐心等待财务处理。',
    ],
  };
  const result = suggestions[ticketType] || suggestions['查询'];
  res.json({ type: ticketType, subject: ticketSubject, suggestions: result, knowledge: [
    { title: '常用回复模板', content: '先道歉，再解决，后安抚。' },
    { title: '安抚话术', content: '非常理解您的心情，我们会尽快处理。' },
    { title: '升级处理', content: '如无法解决，请转主管或投诉专员处理。' },
  ]});
});

// 工单摘要
router.post('/summarize', auth, (req, res) => {
  const { text } = req.body;
  res.json({ summary: `【自动摘要】客户反映问题核心：${String(text || '').substring(0, 100)}${text && text.length > 100 ? '...' : ''}` });
});

// 智能分类预测
router.post('/classify', auth, (req, res) => {
  const { text = '', subject = '' } = req.body;
  const combined = (text + subject);
  let type = '查询';
  let priority = '一般';
  if (/投诉|态度|丢|破损|坏|烂/.test(combined)) type = '投诉';
  else if (/催|快点|尽快|加急|还没/.test(combined)) type = '催件';
  else if (/地址|改址|换地址|更换/.test(combined)) type = '改址';
  else if (/退款|退钱|赔钱|赔偿/.test(combined)) type = '退款';
  if (/非常|很急|立刻|马上|严重/.test(combined)) priority = '非常紧急';
  else if (/尽快|催促|急|坏|破损/.test(combined)) priority = '紧急';
  res.json({ type, priority, confidence: 0.82 });
});

module.exports = router;
