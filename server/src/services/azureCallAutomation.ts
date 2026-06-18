import axios from 'axios';
import { config } from '../config';
import * as crypto from 'crypto';

interface CallAutomationOptions {
  ticket: any;
  customerPhone: string;
  customerName: string;
  prompts: string[];
}

interface CallSession {
  callId: string;
  ticketId: number;
  status: 'initiated' | 'ringing' | 'connected' | 'completed' | 'failed';
  transcript: string;
  recordings: string[];
  dtmfKeys: string;
  startTime: Date;
  endTime?: Date;
  messages: { role: 'system' | 'user' | 'assistant'; text: string; timestamp: Date }[];
}

// 内存中维护通话会话（生产环境建议用 Redis）
const activeSessions: Map<string, CallSession> = new Map();

export class AzureCallAutomationService {
  private connectionString: string;
  private phoneNumber: string;
  private speechKey: string;
  private speechRegion: string;
  private callbackBase: string;

  constructor() {
    this.connectionString = config.azure.acsConnectionString;
    this.phoneNumber = config.azure.acsPhoneNumber || '+10000000000';
    this.speechKey = config.azure.speechKey;
    this.speechRegion = config.azure.speechRegion;
    this.callbackBase = config.azure.callbackBase || 'http://localhost:3001';
  }

  isConfigured(): boolean {
    return !!(this.connectionString && this.speechKey && this.speechRegion);
  }

  // 从连接字符串解析端点
  private getEndpoint(): string {
    // Azure ACS 连接字符串格式：endpoint=https://xxx.communication.azure.com/;accesskey=xxx
    const match = this.connectionString.match(/endpoint=([^;]+)/);
    return match ? match[1] : 'https://communication.azure.com';
  }

  private getAccessKey(): string {
    const match = this.connectionString.match(/accesskey=([^;]+)/);
    return match ? match[1] : '';
  }

  // 发起自动化通话
  async startAutomatedCall(options: CallAutomationOptions): Promise<CallSession> {
    const { ticket, customerPhone, customerName, prompts } = options;
    const callId = `acs-${ticket.id}-${Date.now()}`;

    const session: CallSession = {
      callId,
      ticketId: ticket.id,
      status: 'initiated',
      transcript: '',
      recordings: [],
      dtmfKeys: '',
      startTime: new Date(),
      messages: [{ role: 'system', text: `开始处理工单 #${ticket.id}: ${ticket.title}`, timestamp: new Date() }],
    };

    try {
      // 方案A：有 Azure 配置 → 发起真实通话
      if (this.isConfigured()) {
        const endpoint = this.getEndpoint();
        const accessKey = this.getAccessKey();

        // 1. 发起呼叫
        const callbackUri = `${this.callbackBase}/api/calls/azure/callback?callId=${callId}`;
        const startCallRes = await axios.post(
          `${endpoint}/calling/callConnections?api-version=2024-06-15-preview`,
          {
            targets: [{ rawId: `+${customerPhone.replace(/\D/g, '')}` }],
            sourceCallerIdNumber: { value: this.phoneNumber },
            callbackUri,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessKey}`,
            },
          }
        );

        session.callId = startCallRes.data?.callConnectionId || callId;
        session.status = 'ringing';

        // 2. 等待客户接通（最多等待30秒）
        const connected = await this.waitForConnection(session.callId, 30000);
        if (!connected) {
          session.status = 'failed';
          session.messages.push({ role: 'system', text: '客户未接听或通话失败', timestamp: new Date() });
          activeSessions.set(callId, session);
          return session;
        }

        session.status = 'connected';

        // 3. 多轮对话：播放TTS + 收集语音识别
        for (let i = 0; i < prompts.length; i++) {
          const prompt = prompts[i];
          session.messages.push({ role: 'assistant', text: prompt, timestamp: new Date() });

          // 播放TTS并录音用户回应
          const userResponse = await this.playAndRecognize(session.callId, prompt);
          if (userResponse.text) {
            session.transcript += `AI: ${prompt}\n客户: ${userResponse.text}\n`;
            session.messages.push({ role: 'user', text: userResponse.text, timestamp: new Date() });
          }
          if (userResponse.dtmf) {
            session.dtmfKeys += userResponse.dtmf;
          }

          // 短间隔避免说话重叠
          await new Promise(r => setTimeout(r, 500));
        }

        // 4. 播放结束语
        await this.playPrompt(session.callId, '感谢您的配合，祝您生活愉快，再见。');

        session.status = 'completed';
        session.endTime = new Date();
      } else {
        // 方案B：未配置 Azure → 智能模拟模式
        session.status = 'ringing';
        await new Promise(r => setTimeout(r, 1500));
        session.status = 'connected';

        // 模拟多轮对话
        for (let i = 0; i < prompts.length; i++) {
          session.messages.push({ role: 'assistant', text: prompts[i], timestamp: new Date() });
          await new Promise(r => setTimeout(r, 800));

          // 智能生成"模拟客户"回应（基于工单内容）
          const mockReply = this.generateMockCustomerReply(ticket, i, prompts.length);
          session.messages.push({ role: 'user', text: mockReply, timestamp: new Date() });
          session.transcript += `AI: ${prompts[i]}\n客户: ${mockReply}\n`;
        }

        session.status = 'completed';
        session.endTime = new Date();
      }

      activeSessions.set(callId, session);
      return session;
    } catch (err: any) {
      session.status = 'failed';
      session.messages.push({ role: 'system', text: `通话失败: ${err.message}`, timestamp: new Date() });
      activeSessions.set(callId, session);
      return session;
    }
  }

  // 等待客户接通
  private async waitForConnection(callId: string, timeoutMs: number): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const session = activeSessions.get(callId);
      if (session?.status === 'connected') return true;
      await new Promise(r => setTimeout(r, 1000));
    }
    return false;
  }

  // 播放TTS + 录音识别
  private async playAndRecognize(callId: string, prompt: string): Promise<{ text: string; dtmf?: string }> {
    try {
      if (!this.isConfigured()) return { text: '' };

      const endpoint = this.getEndpoint();
      const accessKey = this.getAccessKey();

      // 使用 Azure ACS Play + Recognize 组合 API
      const recognizeRes = await axios.post(
        `${endpoint}/calling/callConnections/${callId}/recognize?api-version=2024-06-15-preview`,
        {
          recognizeConfiguration: {
            kind: 'choices',
            choices: [
              { label: '已收到/满意/解决', phrases: ['收到了', '满意', '解决了', '可以', '没问题', '收到', '好的', '1'], tone: 'tone1' },
              { label: '未收到/不满意/有问题', phrases: ['没收到', '不满意', '有问题', '还没', '没有', '2'], tone: 'tone2' },
              { label: '需要继续跟进', phrases: ['继续', '再看看', '不确定', '3'], tone: 'tone3' },
            ],
            interruptPrompt: true,
            endSilenceTimeoutInSeconds: 3,
          },
          playPrompt: {
            kind: 'text',
            text: prompt,
            voice: 'zh-CN-XiaoxiaoNeural',
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessKey}`,
          },
        }
      );

      const result = recognizeRes.data?.recognizeResult;
      if (result?.choiceResult) {
        return { text: result.choiceResult.label || '', dtmf: result.choiceResult.choice?.tone };
      }
      return { text: result?.speechResult?.text || '' };
    } catch (err: any) {
      console.error('[Azure ACS] 识别失败:', err.message);
      return { text: '' };
    }
  }

  // 单纯播放提示
  private async playPrompt(callId: string, prompt: string): Promise<void> {
    try {
      if (!this.isConfigured()) return;
      const endpoint = this.getEndpoint();
      const accessKey = this.getAccessKey();
      await axios.post(
        `${endpoint}/calling/callConnections/${callId}/play?api-version=2024-06-15-preview`,
        {
          playSources: [{ kind: 'text', text: prompt, voice: 'zh-CN-XiaoxiaoNeural' }],
          loop: false,
        },
        { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessKey}` } }
      );
    } catch (err) {
      // 忽略播放错误
    }
  }

  // 模拟客户回复（演示/测试用）
  private generateMockCustomerReply(ticket: any, roundIndex: number, totalRounds: number): string {
    const ticketTitle = (ticket.title || '').toLowerCase();
    const description = (ticket.description || '').toLowerCase();

    // 根据工单类型模拟不同的回复模式
    if (ticketTitle.includes('丢失') || description.includes('丢失') || ticketTitle.includes('没收到')) {
      const replies = [
        '嗯，我确实还没有收到快件，能帮我再查一下吗？',
        '快递点说已经派送了，但我根本没接到电话啊',
        '我希望能尽快给我一个说法，这个包裹很重要',
      ];
      return replies[roundIndex % replies.length];
    }

    if (ticketTitle.includes('破损') || description.includes('破损')) {
      const replies = [
        '包裹确实有破损，里面的东西也有损坏',
        '我当时没验货就签收了，打开后才发现问题',
        '这个理赔的流程大概需要多久才能完成？',
      ];
      return replies[roundIndex % replies.length];
    }

    if (ticketTitle.includes('投诉') || description.includes('投诉') || ticketTitle.includes('态度')) {
      const replies = [
        '快递员态度确实不太好，我希望能改善',
        '其实问题不大，就是希望能提醒一下',
        '嗯，好的，我接受你们的道歉',
      ];
      return replies[roundIndex % replies.length];
    }

    // 默认场景
    const defaultReplies = [
      '是的，问题已经解决了，谢谢你们',
      '嗯，我已经收到了，处理得还可以',
      '可以了，这个事情就到这里吧',
    ];
    return defaultReplies[roundIndex % defaultReplies.length];
  }

  getSession(callId: string): CallSession | undefined {
    return activeSessions.get(callId);
  }

  updateSessionFromCallback(callId: string, data: any): void {
    const session = activeSessions.get(callId);
    if (!session) return;

    const eventType = data?.type || data?.eventType;
    if (eventType === 'Microsoft.Communication.CallConnected') {
      session.status = 'connected';
    } else if (eventType === 'Microsoft.Communication.CallDisconnected') {
      session.status = 'completed';
      session.endTime = new Date();
    }
  }
}

export const azureCallAutomationService = new AzureCallAutomationService();
