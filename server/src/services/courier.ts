import axios from 'axios';
import { config } from '../config';

const COURIERS = [
  { id: 'sto', name: '申通快递', logo: 'STO', pricePerKg: 8 },
  { id: 'yto', name: '圆通速递', logo: 'YTO', pricePerKg: 8 },
  { id: 'zto', name: '中通快递', logo: 'ZTO', pricePerKg: 7 },
  { id: 'zjs', name: '宅急送', logo: 'ZJS', pricePerKg: 10 },
  { id: 'bestexpress', name: '百世快递', logo: 'BSHT', pricePerKg: 7 },
];

// ======= 快递鸟物流查询 =======
async function queryKuaidiBird(courier: string, trackingNumber: string): Promise<any> {
  try {
    if (!config.kuaidiBird.ebusinessId || !config.kuaidiBird.apiKey) return null;
    const res = await axios.post(`${config.kuaidiBird.apiBase}/Ebusiness/EbusinessOrderHandle.aspx`, {
      RequestData: JSON.stringify({ OrderCode: '', ShipperCode: courier.toUpperCase(), LogisticCode: trackingNumber }),
      EBusinessID: config.kuaidiBird.ebusinessId,
      RequestType: '1002',
      DataSign: Buffer.from(trackingNumber + config.kuaidiBird.apiKey).toString('base64'),
      DataType: '2',
    });
    return res.data;
  } catch { return null; }
}

// ======= 菜鸟物流查询 =======
async function queryCainiao(courier: string, trackingNumber: string): Promise<any> {
  try {
    if (!config.cainiao.appKey || !config.cainiao.appSecret) return null;
    const res = await axios.get(`${config.cainiao.apiBase}/cainiao/waybill/trace`, {
      params: { appKey: config.cainiao.appKey, waybillNo: trackingNumber, cpCode: courier },
    });
    return res.data;
  } catch { return null; }
}

// ======= 生成模拟物流信息 =======
function buildMockTracking(courier: string, trackingNumber: string) {
  const now = Date.now();
  const events = [
    { time: new Date(now - 3 * 3600 * 1000).toISOString(), status: '快递员已揽件', location: '网点仓库', description: '客户已交寄' },
    { time: new Date(now - 2 * 3600 * 1000).toISOString(), status: '已到达分拣中心', location: '区域分拣中心', description: '正在分拣' },
    { time: new Date(now - 1 * 3600 * 1000).toISOString(), status: '派送中', location: '目的地网点', description: '快递员正在派送' },
  ];
  return {
    courier,
    trackingNumber,
    state: '在途',
    events,
    source: 'mock',
  };
}

export const courierService = {
  getCouriers() { return COURIERS; },

  async track(courier: string, trackingNumber: string): Promise<{ data: any; source: string }> {
    // 依次尝试: 快递鸟 -> 菜鸟 -> 模拟
    const kd = await queryKuaidiBird(courier, trackingNumber);
    if (kd) return { data: kd, source: 'kuaidi-bird' };
    const cn = await queryCainiao(courier, trackingNumber);
    if (cn) return { data: cn, source: 'cainiao' };
    return { data: buildMockTracking(courier, trackingNumber), source: 'mock' };
  },

  async generateWaybill(courier: string, data: any): Promise<any> {
    const now = Date.now();
    const waybillNo = `${courier.toUpperCase().slice(0, 3)}${now}`.toUpperCase();
    return {
      success: true,
      courier,
      waybillNo,
      sender: data.sender,
      receiver: data.receiver,
      weight: data.weight || 1,
      estimatedDelivery: new Date(now + 2 * 86400000),
      printUrl: `https://api.example.com/print/${waybillNo}`,
      createdAt: new Date(),
    };
  },

  async getPrice(courier: string, weight: number): Promise<any> {
    const c = COURIERS.find(x => x.id === courier);
    const basePrice = c ? c.pricePerKg : 8;
    return {
      courier,
      courierName: c?.name,
      weight,
      basePrice,
      totalPrice: Math.round(basePrice * weight * 100) / 100,
      insuranceAvailable: true,
      insurancePrice: Math.round(basePrice * weight * 0.05 * 100) / 100,
    };
  },
};
