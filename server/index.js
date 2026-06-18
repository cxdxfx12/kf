// 快递网点客服系统 - 主入口
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');

const { CallEngine } = require('./services/callEngine');
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const ticketRoutes = require('./routes/tickets');
const callRoutes = require('./routes/calls');
const reportRoutes = require('./routes/reports');
const aiRoutes = require('./routes/ai');
const expressApiRoutes = require('./services/expressApi');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/express', expressApiRoutes);

// 健康检查
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 模拟来电接口（测试用）
app.post('/api/simulate-inbound', (req, res) => {
  const { phone = '1391000000', name = '测试客户' } = req.body || {};
  callEngine.simulateInbound(phone, name);
  res.json({ success: true, message: `已向在线坐席模拟来电：${name} (${phone})` });
});

// 前端静态文件
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io')) return next();
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// 启动呼叫引擎
const callEngine = new CallEngine(io);

server.listen(PORT, () => {
  console.log('\n========================================');
  console.log('🚀  快递网点客服系统已启动');
  console.log('📡  服务地址: http://localhost:' + PORT);
  console.log('🔌  WebSocket: ws://localhost:' + PORT);
  console.log('📊  API 文档: http://localhost:' + PORT + '/api/health');
  console.log('========================================');
  console.log('\n💡  快速使用:');
  console.log('   管理员: admin / 123456');
  console.log('   客服坐席: agent01 ~ agent20 / 123456');
  console.log('\n🧪  测试模拟来电:');
  console.log(`   curl -X POST http://localhost:${PORT}/api/simulate-inbound -H "Content-Type: application/json" -d "{\\\"phone\\\":\\\"1391000000\\\",\\\"name\\\":\\\"测试客户\\\"}"`);
  console.log('\n');
});
