import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { customVoiceService } from '../services/customVoice';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

const router = Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'voice_samples');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB 限制
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['.wav', '.mp3', '.flac', '.ogg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 WAV/MP3/FLAC/OGG 格式'));
    }
  },
});

// 获取音色配置状态
router.get('/config', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const config = customVoiceService.getLocalVoiceConfig();

    // 如果 Azure API 可用，获取更多信息
    if (customVoiceService.isConfigured()) {
      const projects = await customVoiceService.getProjects();
      const deployments = await customVoiceService.getDeployments();

      res.json({
        ...config,
        projects,
        deployments,
        apiAvailable: true,
      });
    } else {
      res.json({
        ...config,
        projects: [],
        deployments: [],
        apiAvailable: false,
        message: '请在系统设置中配置 Azure Speech API 密钥',
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取音色项目列表
router.get('/projects', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const projects = await customVoiceService.getProjects();
    res.json({ projects });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 创建音色项目
router.post('/projects', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, description, locale, gender } = req.body;
    if (!name) return res.status(400).json({ error: '项目名称必填' });

    const project = await customVoiceService.createProject(name, description, locale, gender);
    if (project) {
      res.json({ success: true, project });
    } else {
      res.status(500).json({ error: '创建项目失败' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 删除音色项目
router.delete('/projects/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const success = await customVoiceService.deleteProject(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 上传录音样本
router.post('/samples/upload', authMiddleware, upload.single('audioFile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择音频文件' });
    }

    const { projectId, description } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: '请选择音色项目' });
    }

    const result = await customVoiceService.uploadAudioSample(
      projectId,
      req.file.path,
      req.file.originalname,
      description || ''
    );

    // 上传成功后删除临时文件
    try {
      fs.unlinkSync(req.file.path);
    } catch {}

    if (result.success) {
      res.json({ success: true, sampleId: result.sampleId });
    } else {
      res.status(500).json({ error: result.error || '上传失败' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取项目下的录音样本
router.get('/samples/:projectId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const samples = await customVoiceService.getAudioSamples(req.params.projectId);
    res.json({ samples });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 删除录音样本
router.delete('/samples/:projectId/:sampleId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const success = await customVoiceService.deleteAudioSample(req.params.projectId, req.params.sampleId);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取模型列表
router.get('/models', authMiddleware, async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    const models = await customVoiceService.getModels(projectId);
    res.json({ models });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 创建训练任务
router.post('/models/train', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { projectId, modelName, description } = req.body;
    if (!projectId || !modelName) {
      return res.status(400).json({ error: '项目ID和模型名称必填' });
    }

    const result = await customVoiceService.trainModel(projectId, modelName, description || '');
    if (result.success) {
      res.json({ success: true, modelId: result.modelId });
    } else {
      res.status(500).json({ error: result.error || '创建训练任务失败' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取模型训练状态
router.get('/models/:id/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const model = await customVoiceService.getModelStatus(req.params.id);
    if (model) {
      res.json({ model });
    } else {
      res.status(404).json({ error: '模型不存在' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 删除模型
router.delete('/models/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const success = await customVoiceService.deleteModel(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取部署列表
router.get('/deployments', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const deployments = await customVoiceService.getDeployments();
    res.json({ deployments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 部署模型
router.post('/deployments', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { modelId, endpointName, description } = req.body;
    if (!modelId || !endpointName) {
      return res.status(400).json({ error: '模型ID和端点名称必填' });
    }

    const result = await customVoiceService.deployModel(modelId, endpointName, description || '');
    if (result.success) {
      res.json({ success: true, deploymentId: result.deploymentId, endpointUrl: result.endpointUrl });
    } else {
      res.status(500).json({ error: result.error || '部署失败' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 获取部署状态
router.get('/deployments/:id/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const deployment = await customVoiceService.getDeploymentStatus(req.params.id);
    if (deployment) {
      res.json({ deployment });
    } else {
      res.status(404).json({ error: '部署不存在' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 删除部署
router.delete('/deployments/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const success = await customVoiceService.deleteDeployment(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 保存音色配置到 .env
router.post('/save-config', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { endpointUrl, apiKey, voiceName, modelId } = req.body;

    const envPath = path.join(process.cwd(), '.env');
    let content = '';

    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf-8');
    }

    const updates: Record<string, string> = {
      'AZURE_CUSTOM_VOICE_ENDPOINT': endpointUrl || '',
      'AZURE_CUSTOM_VOICE_API_KEY': apiKey || '',
      'AZURE_CUSTOM_VOICE_NAME': voiceName || 'xiaoxiao',
      'AZURE_CUSTOM_VOICE_MODEL_ID': modelId || '',
    };

    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
      } else {
        content += `\n${key}=${value}`;
      }
      // 运行时立即生效
      process.env[key] = value;
    }

    fs.writeFileSync(envPath, content.trim() + '\n', 'utf-8');

    res.json({ success: true, message: '音色配置已保存' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
