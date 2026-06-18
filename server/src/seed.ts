require('dotenv').config();
import bcrypt from 'bcryptjs';
import { Sequelize } from 'sequelize';
import { sequelize, User, Customer, Order, Ticket, CallRecord, SystemConfig } from './models';

async function seed() {
  console.log('正在创建数据库（如不存在）...');
  try {
    // 使用不指定数据库名的连接创建数据库
    const tempConn = new Sequelize({
      dialect: 'mysql',
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3307,
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      logging: false,
    });
    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'courier_cs'}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await tempConn.close();
    console.log('数据库准备完成');
  } catch (err: any) {
    console.log('创建数据库提示:', err.message);
  }

  console.log('正在同步数据库表...');
  await sequelize.sync({ force: true });
  console.log('数据库同步完成');

  const now = new Date();

  // 1. 用户 / 客服人员
  console.log('1. 创建用户...');
  const admin = await User.create({
    username: 'admin', password: await bcrypt.hash('123456', 10),
    realName: '系统管理员', role: 'admin', phone: '13800000001', email: 'admin@courier.com',
    status: 'active', totalCalls: 0, totalTickets: 0, avgHandleTime: 0, satisfaction: 4.8,
  });

  const manager = await User.create({
    username: 'manager', password: await bcrypt.hash('123456', 10),
    realName: '张主管', role: 'manager', phone: '13800000002', email: 'manager@courier.com',
    status: 'active', totalCalls: 0, totalTickets: 0, avgHandleTime: 0, satisfaction: 4.7,
  });

  const agents: any[] = [];
  const agentNames = [
    { name: '李客服', phone: '13800000101' },
    { name: '王客服', phone: '13800000102' },
    { name: '赵客服', phone: '13800000103' },
    { name: '孙客服', phone: '13800000104' },
    { name: '周客服', phone: '13800000105' },
    { name: '吴客服', phone: '13800000106' },
  ];
  for (let i = 0; i < agentNames.length; i++) {
    const a = await User.create({
      username: `agent${i + 1}`, password: await bcrypt.hash('123456', 10),
      realName: agentNames[i].name, role: 'agent', phone: agentNames[i].phone,
      email: `agent${i + 1}@courier.com`, status: 'active',
      totalCalls: Math.floor(Math.random() * 200) + 100,
      totalTickets: Math.floor(Math.random() * 80) + 20,
      avgHandleTime: Math.round((Math.random() * 8 + 2) * 10) / 10,
      satisfaction: Math.round((Math.random() * 0.5 + 4.2) * 10) / 10,
    });
    agents.push(a);
  }
  console.log(`  - 用户 ${agents.length + 2} 人（管理员 1 / 主管 1 / 客服 ${agents.length}）`);
  console.log(`    登录账号: admin / manager / agent1 ~ agent${agents.length}`);
  console.log(`    统一密码: 123456`);

  // 2. 客户
  console.log('2. 创建客户...');
  const customerNames = [
    { name: '张三', phone: '13910001001', address: '北京市朝阳区望京街 1 号', tags: 'VIP,常寄件', vip: true },
    { name: '李四', phone: '13910001002', address: '北京市海淀区中关村大街 27 号', tags: '常寄件', vip: false },
    { name: '王五', phone: '13910001003', address: '北京市西城区西单北大街 120 号', tags: '常收件', vip: false },
    { name: '赵六', phone: '13910001004', address: '北京市东城区东直门外大街 18 号', tags: 'VIP', vip: true },
    { name: '孙七', phone: '13910001005', address: '北京市丰台区南三环西路 5 号', tags: '常寄件', vip: false },
    { name: '周八', phone: '13910001006', address: '北京市通州区新华大街 99 号', tags: '常收件', vip: false },
    { name: '吴九', phone: '13910001007', address: '上海市浦东新区陆家嘴环路 1000 号', tags: 'VIP,常寄件', vip: true },
    { name: '郑十', phone: '13910001008', address: '上海市黄浦区南京东路 600 号', tags: '常寄件', vip: false },
    { name: '钱十一', phone: '13910001009', address: '广州市天河区天河路 208 号', tags: '常收件', vip: false },
    { name: '陈十二', phone: '13910001010', address: '深圳市南山区科技园南区 5 栋', tags: 'VIP,常寄件', vip: true },
    { name: '刘十三', phone: '13910001011', address: '杭州市西湖区文三路 478 号', tags: '常寄件', vip: false },
    { name: '杨十四', phone: '13910001012', address: '成都市武侯区一环路南一段 24 号', tags: '常收件', vip: false },
    { name: '黄十五', phone: '13910001013', address: '武汉市武昌区中南路 15 号', tags: '常寄件', vip: false },
    { name: '朱十六', phone: '13910001014', address: '南京市鼓楼区中山北路 101 号', tags: '常收件', vip: false },
    { name: '徐十七', phone: '13910001015', address: '苏州市姑苏区人民路 311 号', tags: '常寄件', vip: false },
  ];
  const customers = await Customer.bulkCreate(
    customerNames.map((c, i) => ({
      name: c.name, phone: c.phone, address: c.address, email: `cust${i + 1}@example.com`,
      tags: c.tags, vip: c.vip,
      totalOrders: Math.floor(Math.random() * 50) + 5,
      totalTickets: Math.floor(Math.random() * 10) + 1,
      lastContact: new Date(now.getTime() - Math.random() * 86400000 * 30),
      notes: '',
    }))
  );
  console.log(`  - 客户 ${customers.length} 人`);

  // 3. 订单（四通一达）
  console.log('3. 创建订单...');
  const couriers = ['sto', 'yto', 'zto', 'zjs', 'bestexpress'];
  const courierNames: Record<string, string> = {
    sto: '申通快递', yto: '圆通速递', zto: '中通快递', zjs: '宅急送', bestexpress: '百世快递',
  };
  const statuses = ['pending', 'collected', 'transit', 'delivery', 'delivered', 'exception'];
  const ordersData: any[] = [];
  const trackingPrefixes = ['ST', 'YT', 'ZT', 'ZJS', 'BSHT'];
  for (let i = 0; i < 100; i++) {
    const courierIdx = i % couriers.length;
    const courier = couriers[courierIdx];
    const status = statuses[i % statuses.length];
    const customer = customers[i % customers.length];
    const est = new Date(); est.setDate(est.getDate() + 1 + (i % 3));
    const actual = status === 'delivered' ? new Date(now.getTime() - (i % 5) * 86400000) : null;
    const events = [
      { time: new Date(now.getTime() - (i + 3) * 3600000).toISOString(), status: '快递员已揽件', location: courierNames[courier] + '网点', description: '客户已交寄' },
      { time: new Date(now.getTime() - (i + 2) * 3600000).toISOString(), status: '已到达分拣中心', location: '区域分拣中心', description: '正在分拣' },
    ];
    if (status === 'delivery') events.push({ time: new Date(now.getTime() - 3600000).toISOString(), status: '派送中', location: customer.dataValues.address, description: '快递员正在派送' });
    if (status === 'delivered') events.push({ time: new Date(now.getTime() - 3600000).toISOString(), status: '已签收', location: customer.dataValues.address, description: '本人签收' });
    if (status === 'exception') events.push({ time: new Date(now.getTime() - 3600000).toISOString(), status: '异常件', location: '网点', description: '地址不明确，请联系客服' });
    ordersData.push({
      trackingNumber: `${trackingPrefixes[courierIdx]}${String(20250001 + i).padStart(10, '0')}`,
      courier, courierName: courierNames[courier],
      senderName: `发件方${i + 1}`, senderPhone: `13800${String(i).padStart(6, '0')}`, senderAddress: '北京市朝阳区某地',
      receiverName: customer.dataValues.name, receiverPhone: customer.dataValues.phone, receiverAddress: customer.dataValues.address,
      weight: Math.round((Math.random() * 8 + 0.5) * 10) / 10,
      status, estimatedDelivery: est, actualDelivery: actual,
      trackingInfo: JSON.stringify(events),
      customerId: customer.dataValues.id,
      createdBy: agents[i % agents.length].dataValues.id,
    });
  }
  await Order.bulkCreate(ordersData);
  console.log(`  - 订单 ${ordersData.length} 条（覆盖申通、圆通、中通、宅急送、百世）`);

  // 4. 工单
  console.log('4. 创建工单...');
  const ticketTypes = ['complaint', 'query', 'service', 'claim'];
  const ticketTitles: Record<string, string[]> = {
    complaint: ['包裹破损要求赔偿', '快递延迟未送达', '派件员态度恶劣投诉', '包裹丢失索赔'],
    query: ['运单状态查询', '预计送达时间查询', '配送范围咨询', '收费标准咨询'],
    service: ['上门取件预约', '改址服务申请', '代收款咨询', '寄件单补打'],
    claim: ['保价理赔申请', '丢件理赔', '破损理赔', '延误理赔'],
  };
  const ticketDescriptions: Record<string, string[][]> = {
    complaint: [
      ['我的包裹外包装有明显破损，内部物品损坏，请尽快处理', '包裹已送达但延迟了 3 天，且未收到通知', '派件员不打电话直接扔在驿站', '包裹丢失，索赔未果'],
    ],
    query: [
      ['请帮我查一下这个运单的最新状态', '想了解预估送达时间', '请问你们能送到某某小区吗', '请问省内寄件怎么收费'],
    ],
    service: [
      ['麻烦安排快递员上门取件', '我需要更改收件地址', '咨询代收货款服务条件', '需要补打寄件单'],
    ],
    claim: [
      ['已购买保价，物品损坏需理赔', '包裹丢失，申请理赔', '外包装破损，内部物品损坏', '超过 7 天未送达，申请延误理赔'],
    ],
  };
  const ticketsData: any[] = [];
  for (let i = 0; i < 40; i++) {
    const type = ticketTypes[i % ticketTypes.length];
    const titlePool = ticketTitles[type];
    const descPool = ticketDescriptions[type][0];
    const customer = customers[i % customers.length];
    const priority = i % 5 === 0 ? 'urgent' : i % 3 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low';
    const status = i % 7 === 0 ? 'open' : i % 5 === 0 ? 'assigned' : i % 4 === 0 ? 'processing' : i % 3 === 0 ? 'waiting' : i % 2 === 0 ? 'resolved' : 'closed';
    ticketsData.push({
      title: titlePool[i % titlePool.length], type, priority, status,
      description: descPool[i % descPool.length],
      orderId: (i % 30) + 1,
      customerId: customer.dataValues.id,
      createdBy: agents[i % agents.length].dataValues.id,
      assignedTo: status === 'open' ? null : agents[i % agents.length].dataValues.id,
      resolution: status === 'resolved' || status === 'closed' ? '已电话联系客户，说明情况并提供解决方案，客户满意' : '',
      satisfaction: (status === 'resolved' || status === 'closed') ? Math.round((Math.random() * 1 + 4) * 10) / 10 : null,
      slaMinutes: type === 'complaint' ? 120 : type === 'claim' ? 60 : 240,
      comments: '',
    });
  }
  await Ticket.bulkCreate(ticketsData);
  console.log(`  - 工单 ${ticketsData.length} 条（投诉、查询、服务、理赔）`);

  // 5. 通话记录
  console.log('5. 创建通话记录...');
  const callData: any[] = [];
  const agentIds = agents.map(a => a.dataValues.id);
  for (let i = 0; i < 80; i++) {
    const customer = customers[i % customers.length];
    const aid = agentIds[i % agentIds.length];
    callData.push({
      direction: i % 3 === 0 ? 'inbound' : 'outbound',
      customerPhone: customer.dataValues.phone, customerName: customer.dataValues.name,
      agentId: aid,
      status: i % 10 === 0 ? 'missed' : 'connected',
      startTime: new Date(now.getTime() - (i * 3600 * 1000 * (1 + (i % 5)))),
      endTime: new Date(now.getTime() - (i * 3600 * 1000 * (1 + (i % 5))) + 60000 + (i % 100) * 15000),
      duration: 60 + (i % 100) * 15,
      recordingUrl: '',
      callId: `call-${100000 + i}`,
      notes: i % 4 === 0 ? '客户咨询订单状态，已解答' : '',
      ticketId: i % 5 === 0 ? (i % 30) + 1 : null,
      customerId: customer.dataValues.id,
    });
  }
  await CallRecord.bulkCreate(callData);
  console.log(`  - 通话 ${callData.length} 条`);

  // 6. 系统配置
  console.log('6. 写入系统配置...');
  await SystemConfig.bulkCreate([
    { key: 'site.name', value: '快递网点客服中心', description: '站点名称' },
    { key: 'ticket.sla.minutes', value: '240', description: '工单 SLA 响应时限（分钟）' },
    { key: 'courier.providers', value: JSON.stringify([
      { id: 'sto', name: '申通快递' },
      { id: 'yto', name: '圆通速递' },
      { id: 'zto', name: '中通快递' },
      { id: 'zjs', name: '宅急送' },
      { id: 'bestexpress', name: '百世快递' },
    ]), description: '合作快递服务商列表' },
    { key: 'call.center.provider', value: 'mock', description: '呼叫中心提供商 (mock/ronglian/huawei)' },
    { key: 'ai.provider', value: 'local', description: 'AI 模型提供商 (local/qwen/zhipu)' },
  ]);
  console.log(`  - 系统配置已写入`);

  console.log('\n========== 数据初始化完成 ==========');
  console.log('默认账号: admin / manager / agent1 ~ agent6');
  console.log('默认密码: 123456');
  console.log('MySQL 数据库: courier_cs (在 server/.env 中可配置)');
  console.log('重启服务: cd server && npm run dev');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
