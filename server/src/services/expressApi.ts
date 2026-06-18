import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config';

// 四通一达+顺丰+京东+邮政 编码映射
export const COURIERS: { code: string; name: string; kdnCode: string }[] = [
  { code: 'STO', name: '申通快递', kdnCode: 'STO' },
  { code: 'YTO', name: '圆通速递', kdnCode: 'YTO' },
  { code: 'ZTO', name: '中通快递', kdnCode: 'ZTO' },
  { code: 'YD', name: '韵达快递', kdnCode: 'YD' },
  { code: 'EMS', name: 'EMS邮政', kdnCode: 'EMS' },
  { code: 'SF', name: '顺丰速运', kdnCode: 'SF' },
  { code: 'JD', name: '京东快递', kdnCode: 'JD' },
  { code: 'DBL', name: '德邦快递', kdnCode: 'DBL' },
  { code: 'HTKY', name: '百世快递', kdnCode: 'HTKY' },
  { code: 'OTHER', name: '其他', kdnCode: '' },
];

/**
 * 快递鸟 API 查询物流轨迹
 * https://www.kdniao.com/api-track
 */
async function queryByKdniao(trackingNumber: string, courierCode: string): Promise<any> {
  if (!config.kdniao.enabled || !config.kdniao.eBusinessId || !config.kdniao.apiKey) {
    return null;
  }

  const requestData = JSON.stringify({ OrderCode: '', ShipperCode: courierCode, LogisticCode: trackingNumber });
  const dataSign = encrypt(requestData, config.kdniao.apiKey);

  const params = new URLSearchParams();
  params.append('RequestData', requestData);
  params.append('EBusinessID', config.kdniao.eBusinessId);
  params.append('RequestType', '1002');
  params.append('DataSign', dataSign);
  params.append('DataType', '2');

  const { data } = await axios.post(config.kdniao.apiUrl, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 10000,
  });

  if (data.Success && data.Traces && data.Traces.length > 0) {
    return {
      source: 'kdniao',
      state: data.State,
      traces: data.Traces.map((t: any) => ({
        time: t.AcceptTime,
        location: t.AcceptStation,
        status: t.Location || t.Action || '',
      })),
      courier: courierCode,
    };
  }
  return null;
}

/**
 * 菜鸟 API 查询物流轨迹（taobao open platform 简要实现）
 */
async function queryByCainiao(trackingNumber: string, courierCode: string): Promise<any> {
  if (!config.cainiao.enabled || !config.cainiao.appKey || !config.cainiao.appSecret) {
    return null;
  }
  try {
    // 菜鸟需要更复杂的签名和参数构造，此处为示例
    const timestamp = new Date().toISOString();
    const sign = crypto.createHash('md5').update(`${config.cainiao.appSecret}method=taobao.logistics.trace.search${config.cainiao.appSecret}`).digest('hex').toUpperCase();
    const { data } = await axios.get(config.cainiao.apiUrl, {
      params: {
        method: 'taobao.logistics.trace.search',
        app_key: config.cainiao.appKey,
        timestamp,
        format: 'json',
        v: '2.0',
        sign_method: 'md5',
        sign,
        tracking_number: trackingNumber,
        courier_code: courierCode,
      },
      timeout: 10000,
    });
    if (data && data.traces) {
      return { source: 'cainiao', traces: data.traces, courier: courierCode };
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * 模拟数据（当真实 API 未配置时使用）
 */
function generateMockTrack(trackingNumber: string, courierCode: string): any {
  const now = new Date();
  const times = [0, 3, 8, 24, 36, 48, 72].map(h => {
    const d = new Date(now.getTime() - h * 3600 * 1000);
    return d.toISOString().slice(0, 19).replace('T', ' ');
  });

  const locations = [
    '【收件人】已签收，签收人：本人',
    '快件正在派送中，派送员：王师傅，电话：138****1234',
    '快件已到达【派送网点】',
    '快件已到达【中转站】',
    '快件已从【发件地】发出',
    '快件已揽收，揽收员：李师傅',
    '订单已创建，等待揽收',
  ];

  return {
    source: 'mock',
    courier: courierCode,
    trackingNumber,
    state: '3',
    traces: times.map((t, i) => ({ time: t, location: locations[i], status: `${7 - i}/7` })),
  };
}

/**
 * 快递鸟签名算法（MD5 -> Base64）
 */
function encrypt(content: string, keyValue: string): string {
  const md5 = crypto.createHash('md5').update(content + keyValue).digest('hex');
  return Buffer.from(md5, 'utf8').toString('base64');
}

export const expressApiService = {
  getCouriers() { return COURIERS; },

  async queryTrack(trackingNumber: string, courierCode?: string): Promise<any> {
    const code = courierCode || COURIERS[0].kdnCode;

    // 1) 优先使用快递鸟
    try {
      const kdniao = await queryByKdniao(trackingNumber, code);
      if (kdniao) return kdniao;
    } catch (e) { /* ignore */ }

    // 2) 其次使用菜鸟
    try {
      const cainiao = await queryByCainiao(trackingNumber, code);
      if (cainiao) return cainiao;
    } catch (e) { /* ignore */ }

    // 3) 兜底模拟数据
    return generateMockTrack(trackingNumber, code);
  },
};
