import axios from 'axios';
import { config } from '../config';
import { extractKeywordsFromTranscript } from './ticketAuto';

interface SentimentResult {
  label: 'positive' | 'negative' | 'neutral';
  score: number;
  keywords: string[];
}

interface AnalysisResult {
  keywords: string[];
  sentiment: SentimentResult;
  shouldClose: boolean;
  confidence: number;
  summary: string;
  nextAction: string;
  intent: 'resolved' | 'issue_ongoing' | 'needs_followup';
  satisfaction: number; // 1-5
}

// 正向关键词
const POSITIVE_KEYWORDS = [
  '收到', '收到了', '已收到', '没问题', '满意', '解决了', '处理', '可以了',
  '好的', '谢谢', '感谢', '行', 'ok', '同意', '接受',
  '完结', '结束', '完成', '搞定', '行了', '对的',
];

// 负向关键词
const NEGATIVE_KEYWORDS = [
  '没收到', '未收到', '还没', '还没有', '没有', '找不到',
  '丢失', '破损', '坏了', '损坏', '破碎', '破了',
  '投诉', '投诉', '不满意', '不好', '态度', '太慢', '慢了',
  '继续', '跟进', '再看看', '不确定', '等等', '等一下', '先',
  '投诉', '你们', '态度差', '退款', '退货', '赔钱',
  '问题', '有问题', '不对', '错了',
];

// 情感分析
function analyzeSentiment(text: string): SentimentResult {
  const lowerText = text.toLowerCase();
  let positiveScore = 0;
  let negativeScore = 0;
  const foundKeywords: string[] = [];

  for (const keyword of POSITIVE_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      positiveScore += 1;
      foundKeywords.push(keyword);
    }
  }

  for (const keyword of NEGATIVE_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      negativeScore += 1.5;
      foundKeywords.push(keyword);
    }
  }

  const total = positiveScore + negativeScore;

  if (total === 0) {
    return { label: 'neutral', score: 0.5, keywords: [] };
  }

  if (negativeScore > positiveScore) {
    return {
      label: 'negative',
      score: negativeScore / total,
      keywords: foundKeywords,
    };
  }

  return {
    label: 'positive',
    score: positiveScore / total,
    keywords: foundKeywords,
  };
}

// AI分析类
export class TicketAIAnalyzer {
  private speechKey: string;
  private speechRegion: string;
  private llmService: 'azure' | 'dashscope' | 'zhipu' | 'local';

  constructor() {
    this.speechKey = config.azure.speechKey;
    this.speechRegion = config.azure.speechRegion;
    if (config.azure.openAiApiKey) {
      this.llmService = 'azure';
    } else if (config.dashscope.apiKey) {
      this.llmService = 'dashscope';
    } else if (config.zhipu.apiKey) {
      this.llmService = 'zhipu';
    } else {
      this.llmService = 'local';
    }
  }

  // 主入口：根据通话文本做综合分析
  analyzeTranscript(transcript: string, ticket: any): AnalysisResult {
    const sentiment = analyzeSentiment(transcript);

    // 提取关键词（从之前的ticketAuto服务）
    const keywords = extractKeywordsFromTranscript(transcript);
    const allKeywords = [...keywords, ...sentiment.keywords];

    // 判断是否可以自动结案
    let shouldClose = false;
    let confidence = 0.5;
    let intent: 'resolved' | 'issue_ongoing' | 'needs_followup' = 'needs_followup';
    let summary = '';
    let nextAction = '';
    let satisfaction = 3;

    if (sentiment.label === 'positive') {
      // 客户表达满意
      shouldClose = true;
      confidence = Math.min(0.95, 0.5 + sentiment.score * 0.4);
      intent = 'resolved';
      satisfaction = 4 + sentiment.score;
      summary = '客户对处理结果表示满意，问题已解决';
      nextAction = '建议关闭工单并记录满意度';
    } else if (sentiment.label === 'negative') {
      // 客户表达负面情绪
      shouldClose = false;
      confidence = Math.min(0.9, 0.5 + sentiment.score * 0.4);
      intent = 'issue_ongoing';
      satisfaction = Math.max(1, 3 - sentiment.score * 2);
      summary = '客户仍有不满或问题未完全解决';
      nextAction = '建议分配坐席人工跟进，了解具体问题';
    } else {
      // 中性回应
      shouldClose = false;
      confidence = 0.4;
      intent = 'needs_followup';
      satisfaction = 3;
      summary = '客户回应较为中性，需进一步确认';
      nextAction = '建议24小时内再次联系客户确认';
    }

    // 补充工单标题相关判断
    const ticketTitle = (ticket?.title || '').toLowerCase();
    const ticketDesc = (ticket?.description || '').toLowerCase();
    if (ticketTitle.includes('丢失') || ticketDesc.includes('丢失') || ticketTitle.includes('没收到')) {
      if (!transcript.includes('收到') && !transcript.includes('找到了')) {
        shouldClose = false;
        confidence = Math.max(confidence, 0.8);
        summary = '客户反映未收到包裹，需要继续追查';
        nextAction = '建议联系快递网点确认包裹位置';
      }
    }

    return {
      keywords: allKeywords,
      sentiment,
      shouldClose,
      confidence,
      summary,
      nextAction,
      intent,
      satisfaction,
    };
  }

  // 使用LLM大模型进行高级分析
  async analyzeWithLLM(transcript: string, ticket: any): Promise<AnalysisResult> {
    // 如果配置了大模型API则使用大模型分析
    const prompt = `你是一个客服工单分析专家。

【工单信息】
标题: ${ticket?.title}
描述: ${ticket?.description}

【通话记录】
${transcript}

请分析客户的问题是否已经解决，以JSON格式输出:
{
  "shouldClose": true/false,
  "confidence": 0-1,
  "summary": "50字以内摘要",
  "keywords": ["关键词1", "关键词2"],
  "nextAction": "建议下一步操作",
  "satisfaction": 1-5
}`;

    try {
      let result: any = null;

      if (this.llmService === 'azure' && config.azure.openAiApiKey) {
        result = await this.callAzureOpenAI(prompt);
      } else if (this.llmService === 'dashscope' && config.dashscope.apiKey) {
        result = await this.callDashscope(prompt);
      } else if (this.llmService === 'zhipu' && config.zhipu.apiKey) {
        result = await this.callZhipu(prompt);
      }

      if (result) {
        return {
          keywords: result.keywords || [],
          sentiment: { label: result.shouldClose ? 'positive' : 'negative', score: result.confidence, keywords: result.keywords || [] },
          shouldClose: !!result.shouldClose,
          confidence: result.confidence || 0.7,
          summary: result.summary || 'AI分析完成',
          nextAction: result.nextAction || '请人工确认',
          intent: result.shouldClose ? 'resolved' : 'needs_followup',
          satisfaction: result.satisfaction || 3,
        };
      }
    } catch (err: any) {
      console.error('[LLM] 大模型分析失败，回退到本地规则:', err.message);
    }

    // 大模型调用失败或未配置，使用本地规则分析
    return this.analyzeTranscript(transcript, ticket);
  }

  private async callAzureOpenAI(prompt: string): Promise<any> {
    try {
      const res = await axios.post(
        `${config.azure.openAiEndpoint}/openai/deployments/${config.azure.openAiDeployment || 'gpt-4o-mini'}/chat/completions?api-version=2024-02-15-preview`,
        {
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        },
        { headers: { 'Content-Type': 'application/json', 'api-key': config.azure.openAiApiKey } }
      );
      const content = res.data?.choices?.[0]?.message?.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (err: any) {
      console.error('[Azure OpenAI] 调用失败:', err.message);
      return null;
    }
  }

  private async callDashscope(prompt: string): Promise<any> {
    try {
      const res = await axios.post(
        `${config.dashscope.apiBase}/services/aigc/text-generation/generation`,
        {
          model: config.dashscope.model,
          input: { messages: [{ role: 'user', content: prompt }] },
          parameters: { temperature: 0.3, result_format: 'message' },
        },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.dashscope.apiKey}` } }
      );
      const content = res.data?.output?.choices?.[0]?.message?.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (err: any) {
      console.error('[Dashscope] 调用失败:', err.message);
      return null;
    }
  }

  private async callZhipu(prompt: string): Promise<any> {
    try {
      const res = await axios.post(
        `${config.zhipu.apiBase}/chat/completions`,
        {
          model: config.zhipu.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.zhipu.apiKey}` } }
      );
      const content = res.data?.choices?.[0]?.message?.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (err: any) {
      console.error('[Zhipu] 调用失败:', err.message);
      return null;
    }
  }

  // 生成AI话术
  getPromptsForTicket(ticket: any): string[] {
    const title = ticket?.title || '您的问题';
    const desc = (ticket?.description || '').substring(0, 50);

    return [
      `您好，这里是申通快递客服，工单号${ticket?.id}。关于您反映的「${title}」问题，我们想跟您确认一下，请问您现在方便接听吗？`,
      `请问您的快件现在情况如何？是已经收到了、还是仍在处理中呢？`,
      `请问您对我们这次的处理还满意吗？有什么建议或者意见吗？`,
      `好的，如果没有其他问题，感谢您的来电，祝您生活愉快！`,
    ];
  }
}

export const ticketAIAnalyzer = new TicketAIAnalyzer();
