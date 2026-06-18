import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  server: {
    port: Number(process.env.SERVER_PORT) || 3001,
    env: process.env.NODE_ENV || 'development',
  },
  database: {
    dialect: (process.env.DB_DIALECT || 'sqlite') as 'mysql' | 'postgres' | 'sqlite',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'express_cs',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    storage: process.env.DB_STORAGE || path.join(__dirname, '../../data/database.sqlite'),
    logging: false,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'express-cs-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  kdniao: {
    enabled: process.env.KDNIAO_ENABLED === 'true',
    eBusinessId: process.env.KDNIAO_EBUSINESS_ID || '',
    apiKey: process.env.KDNIAO_API_KEY || '',
    apiUrl: process.env.KDNIAO_API_URL || 'https://api.kdniao.com/Ebusiness/EbusinessOrderHandle.aspx',
  },
  cainiao: {
    enabled: process.env.CAINIAO_ENABLED === 'true',
    appKey: process.env.CAINIAO_APP_KEY || '',
    appSecret: process.env.CAINIAO_APP_SECRET || '',
    apiUrl: process.env.CAINIAO_API_URL || 'https://open.taobao.com/api.htm',
  },
  ccp: {
    enabled: process.env.CCP_ENABLED === 'true',
    accountSid: process.env.CCP_ACCOUNT_SID || '',
    authToken: process.env.CCP_AUTH_TOKEN || '',
    appId: process.env.CCP_APP_ID || '',
    restUrl: process.env.CCP_REST_URL || 'https://app.cloopen.com:8883',
  },
  huaweiCC: {
    enabled: process.env.HUAWEI_CC_ENABLED === 'true',
    appKey: process.env.HUAWEI_APP_KEY || '',
    appSecret: process.env.HUAWEI_APP_SECRET || '',
    apiUrl: process.env.HUAWEI_API_URL || 'https://ccportal.cn-north-4.huaweicloud.com',
  },
  qwen: {
    enabled: process.env.QWEN_ENABLED === 'true',
    apiKey: process.env.QWEN_API_KEY || '',
    model: process.env.QWEN_MODEL || 'qwen-turbo',
    apiUrl: process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
  },
  zhipu: {
    enabled: process.env.ZHIPU_ENABLED === 'true',
    apiKey: process.env.ZHIPU_API_KEY || '',
    model: process.env.ZHIPU_MODEL || 'glm-4',
    apiUrl: process.env.ZHIPU_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  },
};
