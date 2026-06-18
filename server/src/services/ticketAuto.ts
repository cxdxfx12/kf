interface DtmfResult { [key: string]: string; }

export function analyzeDtmfResults(results: DtmfResult, ticket: any): {
  shouldClose: boolean;
  keywords: string[];
  summary: string;
  note: string;
  duration: number;
} {
  const keywords: string[] = [];
  let shouldClose = true;
  const reasons: string[] = [];

  // 第一关：快件状态
  if (results.status === '2') {
    shouldClose = false;
    keywords.push('未收到', '丢失', '延迟');
    reasons.push('客户反馈未收到快件');
  }
  if (results.status === '3') {
    shouldClose = false;
    keywords.push('破损', '异常');
    reasons.push('客户反映快件有问题');
  }
  if (results.status === '1') {
    keywords.push('已收到', '正常');
  }

  // 第二关：满意度
  if (results.satisfaction === '2') {
    shouldClose = false;
    keywords.push('不满意', '投诉', '需人工跟进');
    reasons.push('客户对服务不满意');
  }
  if (results.satisfaction === '1') {
    keywords.push('满意');
  }

  // 第三关：确认完结
  if (results.closeConfirm === '2') {
    shouldClose = false;
    keywords.push('继续跟进');
    reasons.push('客户希望继续跟进');
  }
  if (results.closeConfirm === '1') {
    keywords.push('同意完结');
  }

  return {
    shouldClose,
    keywords,
    summary: shouldClose ? '客户确认问题解决，工单自动完结' : `需人工处理：${reasons.join('；')}`,
    note: `[AI判断] ${shouldClose ? '建议自动完结' : '建议转人工跟进'} | 关键词：${keywords.join('、')}`,
    duration: 30,
  };
}

// 方案二/三/四 会用到的语音转文字关键词提取
export function extractKeywordsFromTranscript(transcript: string): string[] {
  const keywordPatterns = [
    '收到', '没收到', '丢失', '破损', '延迟', '满意', '不满意',
    '投诉', '投诉', '赔偿', '理赔', '运费', '地址', '电话',
    '解决', '没问题', '很好', '不好', '太慢', '态度差',
    '京东', '菜鸟', '快递点', '自提', '派送', '签收',
  ];

  const found: string[] = [];
  keywordPatterns.forEach(kw => {
    if (transcript.includes(kw)) found.push(kw);
  });

  // 扩展识别：否定词+关键词（如"没收到"而非"收到"）
  const negativePatterns = /(没|没|不|未)(收到|找到|解决|满意)/g;
  const m = transcript.match(negativePatterns);
  if (m) found.push(...m);

  return [...new Set(found)];
}

// 判断是否可自动完结
export function shouldAutoCloseTicket(keywords: string[]): {
  close: boolean;
  confidence: number;
  reason: string;
} {
  const positiveWords = ['收到', '满意', '解决', '没问题', '很好', '同意完结'];
  const negativeWords = ['没收到', '未收到', '丢失', '破损', '不满意', '投诉', '赔偿', '不好', '太慢', '态度差', '继续跟进'];

  const positiveCount = keywords.filter(k => positiveWords.some(p => k.includes(p))).length;
  const negativeCount = keywords.filter(k => negativeWords.some(n => k.includes(n))).length;

  if (negativeCount > 0) {
    return { close: false, confidence: Math.min(0.9, negativeCount * 0.2), reason: '检测到负面关键词' };
  }
  if (positiveCount >= 2) {
    return { close: true, confidence: Math.min(0.95, positiveCount * 0.3), reason: '检测到正向确认关键词' };
  }

  return { close: false, confidence: 0.3, reason: '无明确信号，建议人工复核' };
}
