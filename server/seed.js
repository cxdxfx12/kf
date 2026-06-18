// 数据库初始化种子数据 - 生成演示用的客户、订单、工单、通话记录
const db = require('./db');
const bcrypt = require('bcryptjs');

(async () => {
  console.log('正在初始化测试数据...\n');

  // 1. 用户数据
  const hashed = bcrypt.hashSync('123456', 10);
  const users = [
    { id: 1, username: 'admin', password: hashed, name: '系统管理员', role: 'admin', phone: '13800000000', status: 'offline' },
    { id: 2, username: 'supervisor', password: hashed, name: '张主管', role: 'supervisor', phone: '13800000001', status: 'offline' },
  ];
  const agentNames = ['王丽', '李娜', '刘芳', '陈强', '杨静', '黄磊', '赵敏', '周涛', '吴倩', '徐伟',
    '孙丽', '马超', '朱婷', '郭鹏', '何琳', '高翔', '林华', '罗勇', '宋梅', '郑浩'];
  agentNames.forEach((name, i) => {
    users.push({
      id: i + 3, username: `agent${String(i + 1).padStart(2, '0')}`,
      password: hashed, name, role: 'agent',
      phone: `138${String(1000000 + i * 1000).padStart(8, '0')}`, status: 'offline',
    });
  });
  db.reset({ users, customers: [], orders: [], tickets: [], calls: [] });
  console.log(`✓ ${users.length} 个用户账号已创建`);

  // 2. 客户数据
  const customerNames = ['张先生', '李女士', '王经理', '陈阿姨', '刘师傅', '杨同学', '周老板', '吴总',
    '徐阿姨', '孙先生', '赵女士', '钱经理', '马阿姨', '朱老板', '胡同学', '郭师傅',
    '何经理', '高总', '林女士', '罗先生', '宋阿姨', '郑老板', '谢经理', '唐总',
    '韩先生', '冯女士', '董师傅', '萧阿姨', '程经理', '曹老板'];
  const cities = ['北京市朝阳区', '上海市浦东新区', '广州市天河区', '深圳市南山区', '成都市锦江区',
    '杭州市西湖区', '南京市鼓楼区', '武汉市武昌区', '西安市雁塔区', '重庆市渝中区'];
  const streets = ['建国路88号', '中山路123号', '人民路456号', '解放大道789号', '长安街100号',
    '光明路50号', '和平街200号', '胜利大道888号', '幸福路66号', '平安大街188号'];
  const tags = ['VIP客户', '常投诉', '大客户', '偏远地址', '需电话确认', '已实名'];
  const customers = customerNames.map((name, i) => ({
    id: i + 1, name, phone: `139${String(1000000 + i * 137).padStart(8, '0')}`,
    address: `${cities[i % 10]}${streets[i % 10]}`,
    totalOrders: Math.floor(Math.random() * 50) + 5, totalComplaints: Math.floor(Math.random() * 5),
    tags: [tags[i % 6], tags[(i + 2) % 6]].join(','), notes: '',
    createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  customers.forEach(c => db.insert('customers', c));
  console.log(`✓ ${customers.length} 个客户档案已创建`);

  // 3. 订单
  const couriers = ['圆通', '中通', '申通', '百世', '韵达', '顺丰', 'EMS'];
  const orderStatuses = ['待揽收', '运输中', '派送中', '已签收', '异常', '已退回'];
  const itemsPool = ['服装', '电子产品', '化妆品', '食品', '日用品', '图书', '家电', '母婴用品', '办公用品', '五金工具'];
  const orders = [];
  for (let i = 0; i < 200; i++) {
    const cust = customers[i % customers.length];
    const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
    const ctime = new Date(Date.now() - Math.random() * 30 * 24 * 3600 * 1000);
    const trackingData = [
      { time: new Date(ctime.getTime() + 3600000).toLocaleString(), status: '快件已揽收', location: cities[i % 10] },
      { time: new Date(ctime.getTime() + 3600000 * 6).toLocaleString(), status: '快件已发出', location: `${cities[i % 10]} 中转中心` },
      { time: new Date(ctime.getTime() + 3600000 * 18).toLocaleString(), status: '快件到达', location: cities[(i + 3) % 10] },
      { time: new Date(ctime.getTime() + 3600000 * 24).toLocaleString(), status: status === '派送中' ? '快件正在派送' : '派送中', location: cities[(i + 3) % 10] },
    ];
    orders.push({
      orderNo: `${couriers[i % couriers.length].substring(0, 1)}${String(ctime.getTime()).slice(-8)}${String(i).padStart(4, '0')}`,
      courier: couriers[i % couriers.length],
      customerId: cust.id, customerPhone: cust.phone, customerName: cust.name,
      receiverName: cust.name, receiverPhone: cust.phone, receiverAddress: cust.address,
      status, weight: Math.round((Math.random() * 10 + 0.5) * 10) / 10,
      items: `${itemsPool[i % itemsPool.length]} × ${Math.floor(Math.random() * 5) + 1}`,
      currentLocation: cities[i % 10].replace(/[市区]/g, ''),
      estimatedDelivery: new Date(ctime.getTime() + 3 * 24 * 3600 * 1000).toISOString(),
      trackingInfo: JSON.stringify(trackingData),
      createdAt: ctime.toISOString(),
    });
  }
  orders.forEach(o => db.insert('orders', o));
  console.log(`✓ ${orders.length} 个快递订单已生成`);

  // 4. 工单
  const ticketTypes = ['查询', '催件', '投诉', '改址', '退款', '其他'];
  const priorities = ['一般', '紧急', '非常紧急'];
  const ticketStatuses = ['待处理', '处理中', '待回访', '已关闭'];
  const subjects = ['查询包裹物流状态', '快件一直未送达', '包装破损要求赔偿', '需要修改收货地址',
    '派送员态度差', '快件丢失索赔', '签收但未收到', '催件加急处理',
    '拒收后退款', '收件人信息错误', '包裹损坏', '物流信息长时间未更新',
    '要求退件', '派送地址无人', '预约送货时间', '投诉客服态度'];
  const resolutions = ['已联系派送员加急处理，预计今日送达', '已安排补发，快递单号已短信告知',
    '已联系客户安抚，补偿5元优惠券', '地址已修改，重新安排派送',
    '已核实情况，赔付客户20元', '已转投诉专员处理，24小时内回复',
    '系统已更新物流信息，客户已确认收到', '客户表示满意，问题解决'];

  for (let i = 0; i < 80; i++) {
    const cust = customers[i % customers.length];
    const status = ticketStatuses[Math.floor(Math.random() * ticketStatuses.length)];
    const agent = users[2 + (i % 20)];
    const ctime = new Date(Date.now() - Math.random() * 15 * 24 * 3600 * 1000);
    db.insert('tickets', {
      ticketNo: `TK${String(ctime.getTime()).slice(-8)}${String(i).padStart(4, '0')}`,
      customerId: cust.id, customerName: cust.name, customerPhone: cust.phone,
      orderNo: i % 3 === 0 ? null : orders[Math.floor(Math.random() * orders.length)].orderNo,
      type: ticketTypes[i % ticketTypes.length], priority: priorities[Math.floor(Math.random() * priorities.length)],
      status, subject: subjects[i % subjects.length],
      description: `客户来电反映问题：${subjects[i % subjects.length]}。请尽快核实并回复客户。`,
      assigneeId: status === '待处理' ? null : agent.id,
      assigneeName: status === '待处理' ? null : agent.name,
      resolution: status === '已关闭' ? resolutions[i % resolutions.length] : null,
      satisfaction: status === '已关闭' ? Math.floor(Math.random() * 2) + 4 : null,
      slaDeadline: new Date(ctime.getTime() + 24 * 3600 * 1000).toISOString(),
      createdAt: ctime.toISOString(),
    });
  }
  console.log(`✓ 80 个客户工单已生成`);

  // 5. 通话记录
  const callStatuses = ['connected', 'ended', 'missed', 'failed'];
  for (let i = 0; i < 150; i++) {
    const cust = customers[i % customers.length];
    const agent = users[2 + (i % 20)];
    const status = callStatuses[Math.floor(Math.random() * callStatuses.length)];
    const startTime = new Date(Date.now() - Math.random() * 7 * 24 * 3600 * 1000);
    const duration = (status === 'connected' || status === 'ended') ? Math.floor(Math.random() * 300) + 30 : 0;
    db.insert('calls', {
      callId: `CALL${String(startTime.getTime()).slice(-10)}${String(i).padStart(4, '0')}`,
      direction: i % 3 === 0 ? 'inbound' : 'outbound',
      agentId: agent.id, agentName: agent.name,
      customerId: cust.id, customerName: cust.name, customerPhone: cust.phone,
      status, startTime: startTime.toISOString(),
      endTime: new Date(startTime.getTime() + duration * 1000).toISOString(),
      duration,
      summary: status === 'connected' ? `${cust.name}来电咨询订单问题，${agent.name}客服耐心解答，客户表示满意。` : null,
      orderNo: i % 4 === 0 ? orders[Math.floor(Math.random() * orders.length)].orderNo : null,
      ticketId: null, createdAt: startTime.toISOString(),
    });
  }
  console.log(`✓ 150 个通话记录已生成`);

  console.log('\n========================================');
  console.log('🎉 数据初始化完成！');
  console.log('========================================\n');
  console.log('💡 默认登录账号：');
  console.log('   管理员:  admin / 123456');
  console.log('   客服坐席: agent01 ~ agent20 / 123456');
  console.log('   主管:    supervisor / 123456');
  console.log('\n📁 数据文件: data/db.json');
  console.log('   (如需要重置，删除 data/db.json 后重新运行)');
  process.exit(0);
})();
