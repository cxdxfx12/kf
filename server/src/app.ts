import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import { Sequelize } from 'sequelize';
import { sequelize } from './models';
import { CallEngine } from './services/callEngine';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import customerRoutes from './routes/customers';
import orderRoutes from './routes/orders';
import ticketRoutes from './routes/tickets';
import callRoutes from './routes/calls';
import configRoutes from './routes/configs';
import reportRoutes from './routes/reports';
import courierRoutes from './routes/couriers';
import knowledgeRoutes from './routes/knowledge';
import aiTicketRoutes from './routes/aiTickets';
import customVoiceRoutes from './routes/customVoice';

export async function createApp() {
  // 自动创建数据库（如不存在）
  try {
    const tempConn = new Sequelize({
      dialect: 'mysql',
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3307,
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      logging: false,
    });
    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'KF'}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await tempConn.close();
  } catch (err: any) {
    console.log('数据库准备提示:', err.message);
  }

  await sequelize.sync({ force: false, alter: false });
  console.log('MySQL 数据库同步完成');

  const app = express();
  app.use(cors({ origin: '*' }));
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, time: new Date().toISOString(), message: '快递网点客服系统 API 已就绪' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/calls', callRoutes);
  app.use('/api/configs', configRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api', courierRoutes);
  app.use('/api/knowledge', knowledgeRoutes);
  app.use('/api/ai-tickets', aiTicketRoutes); // AI自动处理工单路由
  app.use('/api/voice', customVoiceRoutes); // 客服音色管理路由

  app.get('/api', (_req: Request, res: Response) => {
    res.json({
      api: 'Express Courier v2.0',
      routes: [
        '/api/health', '/api/auth', '/api/users', '/api/customers',
        '/api/orders', '/api/tickets', '/api/calls', '/api/configs',
        '/api/reports', '/api/couriers/list', '/api/couriers/price',
      ],
      socket: true,
    });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err.message || '服务器内部错误' });
  });

  const server = http.createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
  const callEngine = new CallEngine(io);
  callEngine.start();

  return { app, server, io, callEngine };
}
