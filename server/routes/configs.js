const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const router = express.Router();

function toConfigJSON(c) {
  if (!c) return c;
  const raw = typeof c.toJSON === 'function' ? c.toJSON() : c;
  return {
    id: raw.id,
    key: raw.key,
    value: raw.value,
    description: raw.description,
    updatedAt: raw.updated_at || raw.updatedAt,
    createdAt: raw.created_at || raw.createdAt,
  };
}

function getEnvPath() {
  const possible = [
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env'),
  ];
  for (const p of possible) if (fs.existsSync(p)) return p;
  return possible[0];
}

const KEY_MAP = {
  'azure.acsConnectionString': 'AZURE_ACS_CONNECTION_STRING',
  'azure.acsPhoneNumber': 'AZURE_ACS_PHONE_NUMBER',
  'azure.openAiEndpoint': 'AZURE_OPENAI_ENDPOINT',
  'azure.openAiApiKey': 'AZURE_OPENAI_API_KEY',
  'azure.openAiDeployment': 'AZURE_OPENAI_DEPLOYMENT',
  'azure.speechKey': 'AZURE_SPEECH_KEY',
  'azure.speechRegion': 'AZURE_SPEECH_REGION',
  'ronglian.accountSid': 'RONGLIAN_ACCOUNT_SID',
  'ronglian.accountToken': 'RONGLIAN_ACCOUNT_TOKEN',
  'ronglian.appId': 'RONGLIAN_APP_ID',
  'huawei.appKey': 'HUAWEI_APP_KEY',
  'huawei.appSecret': 'HUAWEI_APP_SECRET',
  'dashscope.apiKey': 'DASHSCOPE_API_KEY',
  'dashscope.model': 'DASHSCOPE_MODEL',
  'zhipu.apiKey': 'ZHIPU_API_KEY',
  'zhipu.model': 'ZHIPU_MODEL',
  'kuaidibird.apiKey': 'KUAIDI_API_KEY',
  'kuaidibird.bizId': 'KUAIDI_BIZ_ID',
  'cainiao.appKey': 'CAINIAO_APP_KEY',
  'cainiao.secret': 'CAINIAO_APP_SECRET',
  'sto.appKey': 'STO_APP_KEY',
  'sto.appSecret': 'STO_APP_SECRET',
  'sto.apiBase': 'STO_API_BASE',
  'sto.warehouseCode': 'STO_WAREHOUSE_CODE',
  'site.name': 'SITE_NAME',
  'ticket.sla.minutes': 'TICKET_SLA_MINUTES',
  'call.center.provider': 'CALL_CENTER_PROVIDER',
  'ai.provider': 'AI_PROVIDER',
};

function writeEnvFile(items) {
  const envPath = getEnvPath();
  if (!fs.existsSync(envPath)) {
    console.warn('[配置] .env 文件不存在，跳过写入:', envPath);
    return;
  }

  let content = fs.readFileSync(envPath, 'utf-8');
  const updatedKeys = [];
  for (const item of items) {
    const envKey = KEY_MAP[item.key];
    if (!envKey) continue;

    const value = String(item.value ?? '');
    const escapedValue = value.replace(/"/g, '\\"').replace(/\n/g, '\\n');

    const regex = new RegExp(`^${envKey}=.*`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${envKey}=${escapedValue}`);
    } else {
      content += `\n${envKey}=${escapedValue}`;
    }
    updatedKeys.push(envKey);
    process.env[envKey] = item.value;
  }

  const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);
  const buffer = Buffer.concat([BOM, Buffer.from(content.trim() + '\n', 'utf-8')]);
  fs.writeFileSync(envPath, buffer);
  if (updatedKeys.length > 0) {
    console.log('[配置] 已写入 .env:', updatedKeys.join(', '));
  }
}

router.get('/providers', (req, res) => {
  const azAvailable = !!(process.env.AZURE_ACS_CONNECTION_STRING || process.env.AZURE_OPENAI_API_KEY);
  const rlAvailable = !!(process.env.RONGLIAN_ACCOUNT_SID && process.env.RONGLIAN_ACCOUNT_TOKEN);
  const hwAvailable = !!(process.env.HUAWEI_APP_KEY && process.env.HUAWEI_APP_SECRET);
  const azureAiAvailable = !!(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY);
  const qwenAvailable = !!process.env.DASHSCOPE_API_KEY;
  const zhipuAvailable = !!process.env.ZHIPU_API_KEY;

  res.json({
    callCenter: [
      { id: 'mock', name: 'Mock 模拟呼叫中心', available: true },
      { id: 'azure', name: 'Azure 通信服务', available: azAvailable },
      { id: 'ronglian', name: '容联云通讯', available: rlAvailable },
      { id: 'huawei', name: '华为云呼叫中心', available: hwAvailable },
    ],
    ai: [
      { id: 'local', name: '本地规则引擎', available: true },
      { id: 'azure', name: 'Azure OpenAI', available: azureAiAvailable },
      { id: 'qwen', name: '通义千问 / DashScope', available: qwenAvailable },
      { id: 'zhipu', name: '智谱 AI / ChatGLM', available: zhipuAvailable },
    ],
    couriers: [
      { id: 'kuaidibird', name: '快递鸟', available: !!(process.env.KUAIDI_API_KEY && process.env.KUAIDI_BIZ_ID) },
      { id: 'cainiao', name: '菜鸟开放平台', available: !!(process.env.CAINIAO_APP_KEY && process.env.CAINIAO_APP_SECRET) },
      { id: 'sto', name: '申通快递', available: !!(process.env.STO_APP_KEY && process.env.STO_APP_SECRET) },
      { id: 'yto', name: '圆通速递', available: false },
      { id: 'zto', name: '中通快递', available: false },
      { id: 'bestexpress', name: '百世快递', available: false },
      { id: 'zjs', name: '宅急送', available: false },
    ],
    database: {
      dialect: process.env.DB_DIALECT || 'mysql',
      host: process.env.DB_HOST || '127.0.0.1',
      name: process.env.DB_NAME || 'courier_cs',
    },
  });
});

router.get('/', auth, async (req, res) => {
  try {
    const items = await db.SystemConfig.findAll({ order: [['key', 'ASC']] });
    res.json(items.map(toConfigJSON));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/key/:key', auth, async (req, res) => {
  try {
    const item = await db.SystemConfig.findOne({ where: { key: req.params.key } });
    if (!item) return res.status(404).json({ error: '配置不存在' });
    res.json(toConfigJSON(item));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/key/:key', auth, async (req, res) => {
  try {
    const key = req.params.key;
    const { value, description } = req.body || {};
    const [item, created] = await db.SystemConfig.findOrCreate({
      where: { key },
      defaults: { key, value: value ?? '', description: description || '' },
    });
    if (!created) {
      const patch = {};
      if (value !== undefined) patch.value = value;
      if (description !== undefined) patch.description = description;
      await item.update(patch);
    }

    writeEnvFile([{ key, value: value ?? '' }]);

    const updated = await db.SystemConfig.findOne({ where: { key } });
    res.json(toConfigJSON(updated));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/batch', auth, async (req, res) => {
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items 必须是数组' });

    for (const it of items) {
      if (!it || !it.key) continue;
      await db.SystemConfig.upsert({
        key: it.key,
        value: it.value ?? '',
        description: it.description || '',
      });
    }

    writeEnvFile(items);

    const updated = await db.SystemConfig.findAll({ order: [['key', 'ASC']] });
    res.json({
      success: true,
      message: '配置已保存到数据库并写入 server/.env，部分配置立即生效，完整生效需重启服务。',
      updated: updated.map(toConfigJSON),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/key/:key', auth, async (req, res) => {
  try {
    const removed = await db.SystemConfig.destroy({ where: { key: req.params.key } });
    if (!removed) return res.status(404).json({ error: '配置不存在' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
