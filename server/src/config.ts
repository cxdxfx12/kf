export const config = {
  port: Number(process.env.PORT) || 3002,
  jwt: { secret: process.env.JWT_SECRET || 'courier-cs-secret-key-2025', expiresIn: '7d' },
  database: {
    dialect: process.env.DB_DIALECT || 'mysql',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'courier_cs',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    pool: { max: 20, min: 2, acquire: 60000, idle: 60000 },
  },
  ronglian: {
    accountSid: process.env.RONGLIAN_ACCOUNT_SID || '',
    accountToken: process.env.RONGLIAN_ACCOUNT_TOKEN || '',
    appId: process.env.RONGLIAN_APP_ID || '',
    apiBase: 'https://app.cloopen.com:8883',
  },
  huaweiCloud: {
    appKey: process.env.HUAWEI_APP_KEY || '',
    appSecret: process.env.HUAWEI_APP_SECRET || '',
    apiBase: 'https://api.brain.huaweicloud.com',
  },
  kuaidiBird: {
    ebusinessId: process.env.KUAIDI_BIZ_ID || '',
    apiKey: process.env.KUAIDI_API_KEY || '',
    apiBase: 'https://api.kdniao.com',
  },
  cainiao: {
    appKey: process.env.CAINIAO_APP_KEY || '',
    appSecret: process.env.CAINIAO_APP_SECRET || '',
    apiBase: 'https://open.taobao.com',
  },
  sto: {
    appKey: process.env.STO_APP_KEY || '',
    appSecret: process.env.STO_APP_SECRET || '',
    apiBase: process.env.STO_API_BASE || 'https://open.sto.cn',
    warehouseCode: process.env.STO_WAREHOUSE_CODE || '',
  },
  dashscope: {
    apiKey: process.env.DASHSCOPE_API_KEY || '',
    apiBase: 'https://dashscope.aliyuncs.com/api/v1',
    model: process.env.DASHSCOPE_MODEL || 'qwen-plus',
  },
  zhipu: {
    apiKey: process.env.ZHIPU_API_KEY || '',
    apiBase: 'https://open.bigmodel.cn/api/paas/v4',
    model: process.env.ZHIPU_MODEL || 'glm-4',
  },
  azure: {
    // Azure Communication Services 连接字符串（发起真实电话呼叫）
    acsConnectionString: process.env.AZURE_ACS_CONNECTION_STRING || '',
    acsPhoneNumber: process.env.AZURE_ACS_PHONE_NUMBER || '',
    // Azure 区域
    acsApiBase: process.env.AZURE_ACS_API_BASE || 'https://communication.azure.com',
    // 回调基础 URL（供 Azure 推送通话事件）
    callbackBase: process.env.AZURE_CALLBACK_BASE || '',
    // Azure OpenAI（用于 AI 坐席辅助对话生成）
    openAiEndpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
    openAiApiKey: process.env.AZURE_OPENAI_API_KEY || '',
    openAiDeployment: process.env.AZURE_OPENAI_DEPLOYMENT || '',
    // Azure AI Speech 区域 + 密钥（用于语音合成/识别）
    speechKey: process.env.AZURE_SPEECH_KEY || '',
    speechRegion: process.env.AZURE_SPEECH_REGION || '',
  },
};
