// 快递网点客服系统 - 主入口
require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const db = require('./db');

const { CallEngine } = require('./services/callEngine');
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const ticketRoutes = require('./routes/tickets');
const callRoutes = require('./routes/calls');
const reportRoutes = require('./routes/reports');
const aiRoutes = require('./routes/ai');
const userRoutes = require('./routes/users');
const knowledgeRoutes = require('./routes/knowledge');
const configRoutes = require('./routes/configs');
const courierRoutes = require('./routes/couriers');
const voiceRoutes = require('./routes/customVoice');
const expressApiRoutes = require('./services/expressApi');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || process.env.SERVER_PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/configs', configRoutes);
app.use('/api/couriers', courierRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/express', expressApiRoutes);
app.use('/api/notifications', notificationRoutes);

// 前端静态文件由 Nginx 处理，此处只提供 API 和 Socket.IO

// 启动呼叫引擎
const callEngine = new CallEngine(io);

// 模拟来电接口（测试用）
app.post('/api/simulate-inbound', (req, res) => {
  const { phone = '1391000000', name = '测试客户' } = req.body || {};
  callEngine.simulateInbound(phone, name);
  res.json({ success: true, message: `已向在线坐席模拟来电：${name} (${phone})` });
});

// 数据库初始化后启动服务
(async () => {
  const ok = await db.initDatabase({ alter: false });
  if (!ok) {
    console.warn('⚠ 数据库连接失败，但服务仍可启动（部分功能不可用）');
  }
  // 若 users 表为空，则填充种子数据
  try {
    const userCount = await db.User.count();
    if (userCount === 0) {
      console.log('检测到空数据库，正在填充种子数据...');
      await db.seedData();
    }
  } catch (err) {
    console.warn('种子数据检查失败:', err.message);
  }

  server.listen(PORT, () => {
    console.log('\n========================================');
    console.log('🚀  快递网点客服系统已启动');
    console.log('📡  服务地址: http://localhost:' + PORT);
    console.log('🔌  WebSocket: ws://localhost:' + PORT);
    console.log('📊  API 文档: http://localhost:' + PORT + '/api/health');
    console.log('========================================');
    console.log('\n💡  默认登录账号：');
    console.log('   管理员: admin / 123456');
    console.log('   客服坐席: agent01 ~ agent20 / 123456');
    console.log('   主管:   manager / 123456');
    console.log('\n🧪  测试模拟来电:');
    console.log(`   curl -X POST http://localhost:${PORT}/api/simulate-inbound -H "Content-Type: application/json" -d "{\\\"phone\\\":\\\"1391000000\\\",\\\"name\\\":\\\"测试客户\\\"}"`);
    console.log('\n');
  });
})();
