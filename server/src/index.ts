require('dotenv').config();
import { createApp } from './app';
import { config } from './config';

async function bootstrap() {
  try {
    const { server, callEngine } = await createApp();
    callEngine.start();
    server.listen(config.port, () => {
      console.log(`\n========== 快递网点客服系统 v2.0 ==========`);
      console.log(`后端服务已启动: http://localhost:${config.port}`);
      console.log(`API 健康检查: http://localhost:${config.port}/api/health`);
      console.log(`数据库: ${config.database.dialect}://${config.database.host}:${config.database.port}/${config.database.database}`);
      console.log(`Socket.IO 实时通讯已启用`);
      console.log(`============================================\n`);
    });
  } catch (err) {
    console.error('启动失败', err);
    process.exit(1);
  }
}

bootstrap();
