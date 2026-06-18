import axios from 'axios';
import { config } from '../config';

interface CallResult {
  success: boolean;
  callId?: string;
  source: 'azure' | 'ronglian' | 'huawei' | 'mock';
  message?: string;
  raw?: any;
}

async function callRonglian(from: string, to: string): Promise<CallResult> {
  try {
    if (!config.ronglian.accountSid || !config.ronglian.accountToken) {
      return { success: false, source: 'mock', message: '容联未配置' };
    }
    const { accountSid, accountToken, appId, apiBase } = config.ronglian;
    const auth = Buffer.from(`${accountSid}:${accountToken}`).toString('base64');
    const res = await axios.post(
      `${apiBase}/2013-12-26/Accounts/${accountSid}/Calls/VoiceDoubleCallback`,
      { appId, from, to, maxCallTime: 1800, userData: 'courier-cs' },
      { headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` } }
    );
    return { success: true, callId: res.data?.callId || `rl-${Date.now()}`, source: 'ronglian', raw: res.data };
  } catch (err: any) {
    return { success: false, source: 'mock', message: err.message };
  }
}

// 微软 Azure Call Center AI（Azure AI Speech + Azure OpenAI）
// 通过 Azure Communication Services（ACS）发起呼叫，并使用 Azure OpenAI 做 AI 对话
async function callAzure(from: string, to: string): Promise<CallResult> {
  try {
    if (!config.azure.acsConnectionString) {
      return { success: false, source: 'mock', message: 'Azure ACS 未配置' };
    }
    // 使用 Azure Communication Services Call Automation API
    const res = await axios.post(
      `${config.azure.acsApiBase}/calling/callConnections?api-version=2024-06-15-preview`,
      {
        targets: [{ rawId: `4:${to}` }],
        sourceCallerIdNumber: { value: from || config.azure.acsPhoneNumber || '+10000000000' },
        callbackUri: `${config.azure.callbackBase || 'http://localhost:3001'}/api/calls/azure/callback`,
      },
      { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.azure.acsConnectionString}` } }
    );
    return { success: true, callId: res.data?.callConnectionId || `az-${Date.now()}`, source: 'azure', raw: res.data };
  } catch (err: any) {
    return { success: false, source: 'mock', message: err.message };
  }
}

async function callHuawei(from: string, to: string): Promise<CallResult> {
  try {
    if (!config.huaweiCloud.appKey) {
      return { success: false, source: 'mock', message: '华为云未配置' };
    }
    const res = await axios.post(
      `${config.huaweiCloud.apiBase}/ccic/v1.0/call`,
      { caller: from, called: to, appKey: config.huaweiCloud.appKey, serviceId: 'courier-cs' },
      { headers: { 'Content-Type': 'application/json', 'x-app-secret': config.huaweiCloud.appSecret } }
    );
    return { success: true, callId: res.data?.callId || `hw-${Date.now()}`, source: 'huawei', raw: res.data };
  } catch (err: any) {
    return { success: false, source: 'mock', message: err.message };
  }
}

export const callCenterService = {
  async makeCall(from: string, to: string): Promise<CallResult> {
    // 优先尝试：Azure -> 容联 -> 华为云 -> 模拟
    const az = await callAzure(from, to);
    if (az.success) return az;
    const rl = await callRonglian(from, to);
    if (rl.success) return rl;
    const hw = await callHuawei(from, to);
    if (hw.success) return hw;
    return {
      success: true, callId: `mock-${Date.now()}`, source: 'mock', message: '模拟呼叫中心（请配置真实账号以启用真实呼叫）'
    };
  },

  getProviders() {
    return [
      { id: 'azure', name: '微软 Azure Call Center AI（ACS + Azure OpenAI）', available: !!config.azure.acsConnectionString },
      { id: 'ronglian', name: '容联云通讯', available: !!config.ronglian.accountSid && !!config.ronglian.accountToken },
      { id: 'huawei', name: '华为云联络中心', available: !!config.huaweiCloud.appKey },
      { id: 'mock', name: '内置模拟呼叫（默认）', available: true },
    ];
  },
};
