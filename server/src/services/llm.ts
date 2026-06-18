import axios from 'axios';
import { config } from '../config';

const LOCAL_RULES: Record<string, { suggestedActions: string[]; autoReply: string; priority: string }> = {
  complaint: {
    suggestedActions: [
      '立即核实运单号与客户信息',
      '联系派件员确认状态',
      '如为丢件：联系理赔专员，24h内回复客户',
      '如为破损：按破损处理流程，预约重派',
    ],
    autoReply: '您好，您反映的问题我们已收到，正在核实中，请提供运单号以便我们为您处理。',
    priority: '高',
  },
  query: {
    suggestedActions: [
      '查询最新物流信息并告知客户',
      '若长时间无更新：联系网点仓库',
      '建议客户关注公众号自助查询',
    ],
    autoReply: '您好，您的订单正在派送中，预计今日送达。',
    priority: '中',
  },
  claim: {
    suggestedActions: [
      '核实保单信息，确认是否在保期',
      '联系理赔专员跟进',
      '24h内回复客户处理结果',
    ],
    autoReply: '您好，您的理赔申请已受理，专员会在24h内与您联系。',
    priority: '紧急',
  },
  service: {
    suggestedActions: [
      '记录客户服务需求',
      '生成服务工单并派单',
    ],
    autoReply: '您好，已为您生成服务工单，客服人员将尽快联系您。',
    priority: '中',
  },
};

async function callQwen(prompt: string): Promise<any> {
  try {
    if (!config.dashscope.apiKey) return null;
    const res = await axios.post(
      `${config.dashscope.apiBase}/services/aigc/text-generation/generation`,
      {
        model: config.dashscope.model,
        input: { messages: [{ role: 'user', content: prompt }] },
      },
      { headers: { Authorization: `Bearer ${config.dashscope.apiKey}`, 'Content-Type': 'application/json' } }
    );
    return res.data;
  } catch { return null; }
}

async function callZhipu(prompt: string): Promise<any> {
  try {
    if (!config.zhipu.apiKey) return null;
    const res = await axios.post(
      `${config.zhipu.apiBase}/chat/completions`,
      {
        model: config.zhipu.model, messages: [{ role: 'user', content: prompt }],
      },
      { headers: { Authorization: `Bearer ${config.zhipu.apiKey}`, 'Content-Type': 'application/json' } }
    );
    return res.data;
  } catch { return null; }
}

async function callAzureOpenAI(prompt: string): Promise<any> {
  try {
    if (!config.azure.openAiEndpoint || !config.azure.openAiApiKey || !config.azure.openAiDeployment) return null;
    const res = await axios.post(
      `${config.azure.openAiEndpoint}/openai/deployments/${config.azure.openAiDeployment}/chat/completions?api-version=2024-06-01`,
      { messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 1024 },
      { headers: { 'api-key': config.azure.openAiApiKey, 'Content-Type': 'application/json' } }
    );
    return res.data;
  } catch { return null; }
}

export const llmService = {
  async aiSuggest(type: string, description: string): Promise<any> {
    const ruleKey = Object.keys(LOCAL_RULES).includes(type) ? type : 'service';
    const base = LOCAL_RULES[ruleKey];

    const prompt = `你是快递公司网点客服的 AI 助理。工单类型：${type}，描述：${description}。请给出：1. 处理优先级（高/中/低）；2. 建议的处理步骤（3-5条）；3. 给客户的回复话术（3-5条）。`;

    let aiResult: any = null;
    let aiSource: string = 'local';
    const qwen = await callQwen(prompt);
    if (qwen) { aiResult = { source: 'qwen', raw: qwen }; aiSource = 'qwen'; }
    else {
      const zhipu = await callZhipu(prompt);
      if (zhipu) { aiResult = { source: 'zhipu', raw: zhipu }; aiSource = 'zhipu'; }
      else {
        const azure = await callAzureOpenAI(prompt);
        if (azure) { aiResult = { source: 'azure', raw: azure }; aiSource = 'azure'; }
      }
    }

    return {
      success: true,
      source: aiSource,
      suggestedActions: base.suggestedActions,
      priority: base.priority,
      autoReply: base.autoReply,
      ai: aiResult,
    };
  },

  async aiReply(message: string, _context: any[] = []): Promise<any> {
    const prompt = `你是快递公司网点客服代表，客户发来消息："${message}"。请用专业、礼貌的语气回复，重点：1. 表达关切；2. 请求提供运单号；3. 告知处理时间。`;
    const qwen = await callQwen(prompt);
    if (qwen) {
      const text: string = qwen.output?.text || qwen.choices?.[0]?.message?.content;
      return { success: true, source: 'qwen', reply: text };
    }
    const zhipu = await callZhipu(prompt);
    if (zhipu) {
      const text: string = zhipu.choices?.[0]?.message.content || '';
      return { success: true, source: 'zhipu', reply: text };
    }
    const azure = await callAzureOpenAI(prompt);
    if (azure) {
      const text: string = azure.choices?.[0]?.message?.content || '';
      return { success: true, source: 'azure', reply: text };
    }
    return {
      success: true, source: 'local',
      reply: '您好，感谢您联系我们，请问您的运单号是多少？我们会尽快为您处理。'
    };
  },

  getProviders() {
    return [
      { id: 'azure', name: '微软 Azure OpenAI', available: !!config.azure.openAiEndpoint && !!config.azure.openAiApiKey },
      { id: 'qwen', name: '通义千问（DashScope）', available: !!config.dashscope.apiKey },
      { id: 'zhipu', name: '智谱 AI（GLM）', available: !!config.zhipu.apiKey },
      { id: 'local', name: '本地规则（默认）', available: true },
    ];
  },
};
