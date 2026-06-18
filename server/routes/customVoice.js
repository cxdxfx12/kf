// 定制音色管理 API
const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// 用 SystemConfig 表存储 JSON 数据
async function getStore(key) {
  try {
    const rec = await db.SystemConfig.findOne({ where: { key } });
    if (!rec || !rec.value) return [];
    const parsed = JSON.parse(rec.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

async function setStore(key, data) {
  try {
    const value = JSON.stringify(data);
    const [rec, created] = await db.SystemConfig.findOrCreate({
      where: { key },
      defaults: { key, value, description: `CustomVoice: ${key}` },
    });
    if (!created) await rec.update({ value });
    return true;
  } catch (err) {
    console.error('setStore error:', err);
    return false;
  }
}

async function insertStore(key, item) {
  const list = await getStore(key);
  const id = (list[list.length - 1]?.id || 0) + 1;
  const newItem = { id, ...item, createdAt: new Date().toISOString() };
  list.push(newItem);
  await setStore(key, list);
  return newItem;
}

async function updateStore(key, predicate, patch) {
  const list = await getStore(key);
  for (let i = 0; i < list.length; i++) {
    if (predicate(list[i])) list[i] = { ...list[i], ...patch };
  }
  await setStore(key, list);
  return list;
}

async function removeStore(key, predicate) {
  const list = await getStore(key);
  const removed = list.filter(predicate);
  const kept = list.filter(x => !predicate(x));
  await setStore(key, kept);
  return removed;
}

async function getConfig() {
  try {
    const rec = await db.SystemConfig.findOne({ where: { key: 'voice.config' } });
    if (!rec || !rec.value) return {};
    return JSON.parse(rec.value) || {};
  } catch (err) {
    return {};
  }
}

async function setConfig(patch) {
  const current = await getConfig();
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  const [rec, created] = await db.SystemConfig.findOrCreate({
    where: { key: 'voice.config' },
    defaults: { key: 'voice.config', value: JSON.stringify(next), description: 'CustomVoice 配置' },
  });
  if (!created) await rec.update({ value: JSON.stringify(next) });
  return next;
}

// 配置
router.get('/config', auth, async (req, res) => {
  try {
    const cfg = await getConfig();
    const projects = await getStore('voice.projects');
    const deployments = await getStore('voice.deployments');
    res.json({
      isEnabled: cfg.isEnabled || false,
      voiceName: cfg.voiceName || process.env.AZURE_CUSTOM_VOICE_NAME || '',
      endpointUrl: cfg.endpointUrl || process.env.AZURE_CUSTOM_VOICE_ENDPOINT || '',
      projects,
      deployments,
      apiAvailable: true,
    });
  } catch (err) {
    console.error('/config error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 项目
router.get('/projects', auth, async (req, res) => {
  try {
    const list = await getStore('voice.projects');
    res.json({ projects: list });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/projects', auth, async (req, res) => {
  try {
    const { name, description, locale, gender } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name 必填' });
    const project = await insertStore('voice.projects', {
      name, description: description || '', locale: locale || 'zh-CN', gender: gender || 'female',
      status: 'active',
    });
    res.json({ success: true, project });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/projects/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const removed = await removeStore('voice.projects', p => p.id === id);
    if (!removed.length) return res.status(404).json({ error: '项目不存在' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/samples/:projectId', auth, (req, res) => {
  res.json({ samples: [] });
});

router.post('/samples/upload', auth, (req, res) => {
  res.json({ success: true, sampleId: 'sample_' + Date.now(), message: '已接收，实际上传需要 Azure Speech API 配置' });
});

// 模型
router.get('/models', auth, async (req, res) => {
  try {
    const list = await getStore('voice.models');
    res.json({ models: list });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/models/train', auth, async (req, res) => {
  try {
    const { projectId, modelName } = req.body || {};
    if (!projectId || !modelName) return res.status(400).json({ error: 'projectId 和 modelName 必填' });
    const model = await insertStore('voice.models', {
      projectId, name: modelName, status: 'training',
      locale: 'zh-CN', engine: 'neural',
    });
    setTimeout(async () => {
      await updateStore('voice.models', m => m.id === model.id, { status: 'ready' });
    }, 2000);
    res.json({ success: true, modelId: model.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 部署
router.get('/deployments', auth, async (req, res) => {
  try {
    const list = await getStore('voice.deployments');
    res.json({ deployments: list });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/deployments', auth, async (req, res) => {
  try {
    const { modelId, endpointName } = req.body || {};
    if (!modelId || !endpointName) return res.status(400).json({ error: 'modelId 和 endpointName 必填' });
    const endpointUrl = `https://eastus.api.cognitive.microsoft.com/customvoice/endpoints/${endpointName}`;
    const deployment = await insertStore('voice.deployments', {
      modelId, endpointName, endpointUrl, status: 'deployed',
    });
    res.json({ success: true, deploymentId: deployment.id, endpointUrl });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/save-config', auth, async (req, res) => {
  try {
    const { endpointUrl, apiKey, voiceName, modelId } = req.body || {};
    await setConfig({ endpointUrl, apiKey, voiceName, modelId, isEnabled: true });
    res.json({ success: true, message: '音色配置已保存' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
