import { Router, Request, Response } from 'express';
import { SystemConfig } from '../models';
import { authMiddleware } from '../middleware/auth';
import { callCenterService } from '../services/callCenter';
import { llmService } from '../services/llm';
import { config } from '../config';
import * as fs from 'fs';
import * as path from 'path';

// 解析 .env 文件路径（兼容 ts-node-dev 和编译后运行）
function getEnvPath(): string {
  const possible = [
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
  ];
  for (const p of possible) if (fs.existsSync(p)) return p;
  return possible[0];
}

// 前端字段名 -> .env 变量名映射（与 config.ts 变量名完全一致）
const KEY_MAP: Record<string, string> = {
  // Azure 呼叫中心
  'azure.acsConnectionString': 'AZURE_ACS_CONNECTION_STRING',
  'azure.acsPhoneNumber': 'AZURE_ACS_PHONE_NUMBER',
  'azure.openAiEndpoint': 'AZURE_OPENAI_ENDPOINT',
  'azure.openAiApiKey': 'AZURE_OPENAI_API_KEY',
  'azure.openAiDeployment': 'AZURE_OPENAI_DEPLOYMENT',
  'azure.speechKey': 'AZURE_SPEECH_KEY',
  'azure.speechRegion': 'AZURE_SPEECH_REGION',
  // 容联云通讯
  'ronglian.accountSid': 'RONGLIAN_ACCOUNT_SID',
  'ronglian.accountToken': 'RONGLIAN_ACCOUNT_TOKEN',
  'ronglian.appId': 'RONGLIAN_APP_ID',
  // 华为云联络中心
  'huawei.appKey': 'HUAWEI_APP_KEY',
  'huawei.appSecret': 'HUAWEI_APP_SECRET',
  // 通义千问
  'dashscope.apiKey': 'DASHSCOPE_API_KEY',
  'dashscope.model': 'DASHSCOPE_MODEL',
  // 智谱 AI
  'zhipu.apiKey': 'ZHIPU_API_KEY',
  'zhipu.model': 'ZHIPU_MODEL',
  // 快递鸟
  'kuaidibird.apiKey': 'KUAIDI_API_KEY',
  'kuaidibird.bizId': 'KUAIDI_BIZ_ID',
  // 菜鸟开放平台
  'cainiao.appKey': 'CAINIAO_APP_KEY',
  'cainiao.secret': 'CAINIAO_SECRET',
  // 申通官方 API
  'sto.appKey': 'STO_APP_KEY',
  'sto.appSecret': 'STO_APP_SECRET',
  'sto.apiBase': 'STO_API_BASE',
  'sto.warehouseCode': 'STO_WAREHOUSE_CODE',
  // 站点配置
  'site.name': 'SITE_NAME',
  'ticket.sla.minutes': 'TICKET_SLA_MINUTES',
  'call.center.provider': 'CALL_CENTER_PROVIDER',
  'ai.provider': 'AI_PROVIDER',
};

function writeEnvFile(items: { key: string; value: string }[]): void {
  const envPath = getEnvPath();
  if (!fs.existsSync(envPath)) {
    console.warn('[配置] .env 文件不存在，跳过写入:', envPath);
    return;
  }

  let content = fs.readFileSync(envPath, 'utf-8');
  for (const item of items) {
    const envKey = KEY_MAP[item.key];
    if (!envKey) continue;

    const regex = new RegExp(`^${envKey}=.*`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${envKey}=${item.value}`);
    } else {
      content += `\n${envKey}=${item.value}`;
    }
  }

  // 运行时生效
  for (const item of items) {
    const envKey = KEY_MAP[item.key];
    if (envKey) process.env[envKey] = item.value;
  }

  fs.writeFileSync(envPath, content.trim() + '\n', 'utf-8');
  console.log('[配置] 已写入 .env:', items.map(i => KEY_MAP[i.key]).filter(Boolean).join(', '));
}

const router = Router();

// 提供商清单（呼叫中心 + AI 模型）
router.get('/providers', async (_req: Request, res: Response) => {
  try {
    const couriers = [
      { id: 'kuaidibird', name: '快递鸟', apiKey: !!config.kuaidiBird.apiKey },
      { id: 'cainiao', name: '菜鸟开放平台', apiKey: !!config.cainiao.appKey },
      { id: 'sto', name: '申通快递', apiKey: !!config.sto.appKey },
      { id: 'yto', name: '圆通速递', apiKey: !!config.kuaidiBird.apiKey },
      { id: 'zto', name: '中通快递', apiKey: !!config.kuaidiBird.apiKey },
      { id: 'bestexpress', name: '百世快递', apiKey: !!config.kuaidiBird.apiKey },
      { id: 'zjs', name: '宅急送', apiKey: !!config.kuaidiBird.apiKey },
    ];
    res.json({
      callCenter: callCenterService.getProviders(),
      ai: llmService.getProviders(),
      couriers,
      database: { dialect: config.database.dialect, host: config.database.host, name: config.database.database },
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// 所有配置
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const rows = await SystemConfig.findAll({ order: [['id', 'ASC']] });
    res.json(rows);
  } catch (err) { res.status(500).json({ error: '查询失败', detail: (err as any).message }); }
});

// 根据 key 获取
router.get('/key/:key', authMiddleware, async (req: Request, res: Response) => {
  try {
    const row = await SystemConfig.findOne({ where: { key: req.params.key } });
    if (!row) return res.status(404).json({ error: '配置不存在' });
    res.json(row);
  } catch (err) { res.status(500).json({ error: '查询失败', detail: (err as any).message }); }
});

// 更新配置
router.put('/key/:key', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { value, description } = req.body;
    let row = await SystemConfig.findOne({ where: { key: req.params.key } });
    if (!row) row = await SystemConfig.create({ key: req.params.key, value: value || '', description: description || '' });
    else await row.update({ value: value || '', description: description || '' });
    res.json(row);
  } catch (err) { res.status(500).json({ error: '更新失败', detail: (err as any).message }); }
});

// 批量保存（写入数据库 + 同步到 server/.env）
router.post('/batch', authMiddleware, async (req: Request, res: Response) => {
  try {
    const items = req.body.items || [];
    for (const item of items) {
      const row = await SystemConfig.findOne({ where: { key: item.key } });
      if (row) await row.update({ value: item.value, description: item.description || '' });
      else await SystemConfig.create({ key: item.key, value: item.value, description: item.description || '' });
    }

    // 同步写入 .env 文件（永久保存）
    writeEnvFile(items);

    res.json({ success: true, message: '配置已保存到数据库并写入 server/.env，重启服务后完全生效。' });
  } catch (err) { res.status(500).json({ error: '保存失败', detail: (err as any).message }); }
});

export default router;
