import axios from 'axios';
import { config } from '../config';
import * as crypto from 'crypto';

export class StoService {
  private readonly appKey: string;
  private readonly appSecret: string;
  private readonly apiBase: string;
  private readonly warehouseCode: string;

  constructor() {
    this.appKey = config.sto.appKey;
    this.appSecret = config.sto.appSecret;
    this.apiBase = config.sto.apiBase;
    this.warehouseCode = config.sto.warehouseCode;
  }

  isAvailable(): boolean {
    return !!this.appKey && !!this.appSecret;
  }

  private async request(method: string, path: string, data: any = {}): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('申通API未配置');
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signStr = this.appKey + timestamp + this.appSecret;
    const signature = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();

    const headers = {
      'Content-Type': 'application/json',
      'AppKey': this.appKey,
      'Timestamp': timestamp,
      'Signature': signature,
    };

    const url = `${this.apiBase}${path}`;
    const res = await axios({ method, url, headers, data });
    return res.data;
  }

  async createOrder(order: {
    orderNo: string;
    senderName: string;
    senderPhone: string;
    senderAddress: string;
    receiverName: string;
    receiverPhone: string;
    receiverAddress: string;
    weight: number;
    goodsName: string;
  }): Promise<any> {
    return this.request('POST', '/api/order/create', {
      warehouseCode: this.warehouseCode,
      orderNo: order.orderNo,
      sender: {
        name: order.senderName,
        phone: order.senderPhone,
        address: order.senderAddress,
      },
      receiver: {
        name: order.receiverName,
        phone: order.receiverPhone,
        address: order.receiverAddress,
      },
      weight: order.weight,
      goodsName: order.goodsName,
    });
  }

  async queryTracking(trackingNumber: string): Promise<any> {
    return this.request('GET', '/api/tracking/query', {
      trackingNumber,
    });
  }

  async subscribeTracking(trackingNumber: string, callbackUrl: string): Promise<any> {
    return this.request('POST', '/api/tracking/subscribe', {
      trackingNumber,
      callbackUrl,
    });
  }

  async queryOrderStatus(orderNo: string): Promise<any> {
    return this.request('GET', '/api/order/status', { orderNo });
  }

  async queryBalance(): Promise<any> {
    return this.request('GET', '/api/balance/query', { warehouseCode: this.warehouseCode });
  }

  async printLabel(orderNo: string): Promise<any> {
    return this.request('POST', '/api/label/print', { orderNo });
  }
}

export const stoService = new StoService();