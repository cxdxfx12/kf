import axios from 'axios';
import { config } from '../config';
import * as fs from 'fs';
import * as path from 'path';
import { Request, Response } from 'express';

// Azure Custom Neural Voice API 文档：https://speech.microsoft.com/customvoice

interface VoiceProject {
  id: string;
  name: string;
  description: string;
  createdDateTime: string;
  locale: string;
  gender: string;
}

interface VoiceModel {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: 'NotStarted' | 'Running' | 'Succeeded' | 'Failed';
  createdDateTime: string;
  trainingProgress?: number;
}

interface Deployment {
  id: string;
  projectId: string;
  modelId: string;
  name: string;
  status: 'NotStarted' | 'Running' | 'Succeeded' | 'Failed';
  endpointUrl?: string;
}

export class CustomVoiceService {
  private speechKey: string;
  private speechRegion: string;
  private customVoiceEndpoint: string;

  constructor() {
    this.speechKey = config.azure.speechKey;
    this.speechRegion = config.azure.speechRegion || 'eastasia';
    // Azure AI Studio Custom Voice API
    this.customVoiceEndpoint = `https://${this.speechRegion}.customvoice.ai`;
  }

  isConfigured(): boolean {
    return !!(this.speechKey && this.speechRegion);
  }

  // 获取认证头
  private getHeaders(): Record<string, string> {
    return {
      'Ocp-Apim-Subscription-Key': this.speechKey,
      'Content-Type': 'application/json',
    };
  }

  // ========== 1. 项目管理 ==========

  // 获取所有音色项目
  async getProjects(): Promise<VoiceProject[]> {
    try {
      const res = await axios.get(
        `${this.customVoiceEndpoint}/api/projects`,
        { headers: this.getHeaders() }
      );
      return res.data.value || [];
    } catch (err: any) {
      console.error('[CustomVoice] 获取项目失败:', err.message);
      return [];
    }
  }

  // 创建音色项目
  async createProject(name: string, description: string, locale: string = 'zh-CN', gender: string = 'Female'): Promise<VoiceProject | null> {
    try {
      const res = await axios.post(
        `${this.customVoiceEndpoint}/api/projects`,
        { name, description, locale, gender },
        { headers: this.getHeaders() }
      );
      return res.data;
    } catch (err: any) {
      console.error('[CustomVoice] 创建项目失败:', err.message);
      return null;
    }
  }

  // 删除音色项目
  async deleteProject(projectId: string): Promise<boolean> {
    try {
      await axios.delete(`${this.customVoiceEndpoint}/api/projects/${projectId}`, {
        headers: this.getHeaders(),
      });
      return true;
    } catch (err: any) {
      console.error('[CustomVoice] 删除项目失败:', err.message);
      return false;
    }
  }

  // ========== 2. 录音样本管理 ==========

  // 上传真人录音样本
  async uploadAudioSample(
    projectId: string,
    filePath: string,
    fileName: string,
    description: string = ''
  ): Promise<{ success: boolean; sampleId?: string; error?: string }> {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '文件不存在' };
      }

      const fileContent = fs.readFileSync(filePath);
      const formData = new FormData();
      formData.append('audioFile', Buffer.from(fileContent), {
        filename: fileName,
        contentType: 'audio/wav',
      });
      formData.append('displayName', fileName.replace(/\.[^.]+$/, ''));
      formData.append('description', description);

      const res = await axios.post(
        `${this.customVoiceEndpoint}/api/datasets/${projectId}/audio`,
        formData,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.speechKey,
            ...formData.getHeaders(),
          },
        }
      );

      return { success: true, sampleId: res.data.id };
    } catch (err: any) {
      console.error('[CustomVoice] 上传样本失败:', err.message);
      return { success: false, error: err.response?.data?.error?.message || err.message };
    }
  }

  // 获取项目下的所有录音样本
  async getAudioSamples(projectId: string): Promise<any[]> {
    try {
      const res = await axios.get(
        `${this.customVoiceEndpoint}/api/datasets/${projectId}/audio`,
        { headers: this.getHeaders() }
      );
      return res.data.value || [];
    } catch (err: any) {
      console.error('[CustomVoice] 获取样本失败:', err.message);
      return [];
    }
  }

  // 删除录音样本
  async deleteAudioSample(projectId: string, sampleId: string): Promise<boolean> {
    try {
      await axios.delete(
        `${this.customVoiceEndpoint}/api/datasets/${projectId}/audio/${sampleId}`,
        { headers: this.getHeaders() }
      );
      return true;
    } catch (err: any) {
      console.error('[CustomVoice] 删除样本失败:', err.message);
      return false;
    }
  }

  // ========== 3. 训练模型 ==========

  // 创建训练任务
  async trainModel(
    projectId: string,
    modelName: string,
    modelDescription: string = ''
  ): Promise<{ success: boolean; modelId?: string; error?: string }> {
    try {
      const res = await axios.post(
        `${this.customVoiceEndpoint}/api/models`,
        {
          projectId,
          name: modelName,
          description: modelDescription,
          // 训练数据来源：使用项目中的所有合格录音
        },
        { headers: this.getHeaders() }
      );
      return { success: true, modelId: res.data.id };
    } catch (err: any) {
      console.error('[CustomVoice] 创建训练任务失败:', err.message);
      return { success: false, error: err.response?.data?.error?.message || err.message };
    }
  }

  // 获取模型训练状态
  async getModelStatus(modelId: string): Promise<VoiceModel | null> {
    try {
      const res = await axios.get(
        `${this.customVoiceEndpoint}/api/models/${modelId}`,
        { headers: this.getHeaders() }
      );
      return res.data;
    } catch (err: any) {
      console.error('[CustomVoice] 获取模型状态失败:', err.message);
      return null;
    }
  }

  // 获取所有模型
  async getModels(projectId?: string): Promise<VoiceModel[]> {
    try {
      const url = projectId
        ? `${this.customVoiceEndpoint}/api/models?projectId=${projectId}`
        : `${this.customVoiceEndpoint}/api/models`;
      const res = await axios.get(url, { headers: this.getHeaders() });
      return res.data.value || [];
    } catch (err: any) {
      console.error('[CustomVoice] 获取模型列表失败:', err.message);
      return [];
    }
  }

  // 删除模型
  async deleteModel(modelId: string): Promise<boolean> {
    try {
      await axios.delete(`${this.customVoiceEndpoint}/api/models/${modelId}`, {
        headers: this.getHeaders(),
      });
      return true;
    } catch (err: any) {
      console.error('[CustomVoice] 删除模型失败:', err.message);
      return false;
    }
  }

  // ========== 4. 模型部署 ==========

  // 部署模型（创建端点）
  async deployModel(
    modelId: string,
    endpointName: string,
    description: string = ''
  ): Promise<{ success: boolean; deploymentId?: string; endpointUrl?: string; error?: string }> {
    try {
      const res = await axios.post(
        `${this.customVoiceEndpoint}/api/endpoints`,
        {
          modelId,
          name: endpointName,
          description,
        },
        { headers: this.getHeaders() }
      );
      return {
        success: true,
        deploymentId: res.data.id,
        endpointUrl: res.data.endpointUrl,
      };
    } catch (err: any) {
      console.error('[CustomVoice] 部署模型失败:', err.message);
      return { success: false, error: err.response?.data?.error?.message || err.message };
    }
  }

  // 获取部署端点状态
  async getDeploymentStatus(deploymentId: string): Promise<Deployment | null> {
    try {
      const res = await axios.get(
        `${this.customVoiceEndpoint}/api/endpoints/${deploymentId}`,
        { headers: this.getHeaders() }
      );
      return res.data;
    } catch (err: any) {
      console.error('[CustomVoice] 获取部署状态失败:', err.message);
      return null;
    }
  }

  // 获取所有部署端点
  async getDeployments(): Promise<Deployment[]> {
    try {
      const res = await axios.get(`${this.customVoiceEndpoint}/api/endpoints`, {
        headers: this.getHeaders(),
      });
      return res.data.value || [];
    } catch (err: any) {
      console.error('[CustomVoice] 获取部署列表失败:', err.message);
      return [];
    }
  }

  // 删除部署端点
  async deleteDeployment(deploymentId: string): Promise<boolean> {
    try {
      await axios.delete(`${this.customVoiceEndpoint}/api/endpoints/${deploymentId}`, {
        headers: this.getHeaders(),
      });
      return true;
    } catch (err: any) {
      console.error('[CustomVoice] 删除部署失败:', err.message);
      return false;
    }
  }

  // ========== 5. 使用音色进行语音合成 ==========

  // 使用自定义音色进行 TTS
  async speakWithCustomVoice(
    endpointUrl: string,
    apiKey: string,
    text: string,
    outputPath: string
  ): Promise<{ success: boolean; audioPath?: string; error?: string }> {
    try {
      const res = await axios.post(
        endpointUrl,
        {
          input: text,
          voice: 'custom',
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );

      fs.writeFileSync(outputPath, res.data);
      return { success: true, audioPath: outputPath };
    } catch (err: any) {
      console.error('[CustomVoice] TTS 合成失败:', err.message);
      return { success: false, error: err.message };
    }
  }

  // ========== 6. 本地音色配置管理（不依赖 Azure API）============

  // 获取本地音色配置（存储在数据库或 .env）
  getLocalVoiceConfig(): {
    isEnabled: boolean;
    voiceName: string;
    endpointUrl: string;
    apiKey: string;
    sampleCount: number;
    status: string;
  } {
    return {
      isEnabled: !!config.azure.customVoiceEndpoint,
      voiceName: process.env.AZURE_CUSTOM_VOICE_NAME || 'xiaoxiao',
      endpointUrl: config.azure.customVoiceEndpoint || '',
      apiKey: config.azure.customVoiceApiKey || '',
      sampleCount: parseInt(process.env.AZURE_CUSTOM_VOICE_SAMPLES || '0', 10),
      status: config.azure.customVoiceEndpoint ? '已配置' : '未配置',
    };
  }
}

export const customVoiceService = new CustomVoiceService();
