// 使用 Sequelize + MySQL 重写的数据库层
const { Sequelize, DataTypes, Op, QueryTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

// ==================== 连接配置 ====================
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_NAME = process.env.DB_NAME || 'courier_cs';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_DIALECT = (process.env.DB_DIALECT || 'mysql').toLowerCase();

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: DB_DIALECT === 'postgres' ? 'postgres' : 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  timezone: '+08:00',
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

// ==================== 工具函数 ====================
// snake_case -> camelCase
function camelCase(s) {
  return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}
function toPlain(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(toPlain);
  const raw = typeof obj.toJSON === 'function' ? obj.toJSON() : obj;
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    out[camelCase(k)] = v;
  }
  return out;
}
function pickPlain(obj, keys) {
  const p = toPlain(obj);
  const out = {};
  for (const k of keys) out[k] = p[k];
  return out;
}

// ==================== 模型定义 ====================
const User = sequelize.define('users', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  real_name: { type: DataTypes.STRING(100), allowNull: true },
  role: {
    type: DataTypes.ENUM('admin', 'manager', 'agent'),
    allowNull: false,
    defaultValue: 'agent',
  },
  phone: { type: DataTypes.STRING(30), allowNull: true },
  email: { type: DataTypes.STRING(100), allowNull: true },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'online', 'offline', 'busy'),
    allowNull: false,
    defaultValue: 'inactive',
  },
  total_calls: { type: DataTypes.INTEGER, defaultValue: 0 },
  total_tickets: { type: DataTypes.INTEGER, defaultValue: 0 },
  avg_handle_time: { type: DataTypes.FLOAT, defaultValue: 0 },
  satisfaction: { type: DataTypes.FLOAT, defaultValue: 0 },
}, { tableName: 'users' });

const Customer = sequelize.define('customers', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  phone: { type: DataTypes.STRING(30), unique: true, allowNull: false },
  address: { type: DataTypes.STRING(255), allowNull: true },
  email: { type: DataTypes.STRING(100), allowNull: true },
  tags: { type: DataTypes.STRING(255), allowNull: true },
  vip: { type: DataTypes.TINYINT(1), defaultValue: 0 },
  total_orders: { type: DataTypes.INTEGER, defaultValue: 0 },
  total_tickets: { type: DataTypes.INTEGER, defaultValue: 0 },
  last_contact: { type: DataTypes.DATE, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'customers' });

const Order = sequelize.define('orders', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tracking_number: { type: DataTypes.STRING(100), unique: true, allowNull: false },
  courier: { type: DataTypes.STRING(50), allowNull: true },
  sender_name: { type: DataTypes.STRING(100), allowNull: true },
  sender_phone: { type: DataTypes.STRING(30), allowNull: true },
  sender_address: { type: DataTypes.STRING(255), allowNull: true },
  receiver_name: { type: DataTypes.STRING(100), allowNull: true },
  receiver_phone: { type: DataTypes.STRING(30), allowNull: true },
  receiver_address: { type: DataTypes.STRING(255), allowNull: true },
  weight: { type: DataTypes.FLOAT, defaultValue: 0 },
  status: {
    type: DataTypes.ENUM('pending', 'collected', 'transit', 'delivery', 'delivered', 'exception', 'returned'),
    allowNull: false,
    defaultValue: 'pending',
  },
  estimated_delivery: { type: DataTypes.DATE, allowNull: true },
  actual_delivery: { type: DataTypes.DATE, allowNull: true },
  tracking_info: { type: DataTypes.TEXT, allowNull: true },
  customer_id: { type: DataTypes.INTEGER, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'orders' });

const Ticket = sequelize.define('tickets', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(255), allowNull: true },
  type: {
    type: DataTypes.ENUM('complaint', 'query', 'service', 'claim', 'other'),
    allowNull: false,
    defaultValue: 'query',
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    allowNull: false,
    defaultValue: 'medium',
  },
  status: {
    type: DataTypes.ENUM('open', 'assigned', 'processing', 'waiting', 'resolved', 'closed'),
    allowNull: false,
    defaultValue: 'open',
  },
  description: { type: DataTypes.TEXT, allowNull: true },
  order_id: { type: DataTypes.INTEGER, allowNull: true },
  customer_id: { type: DataTypes.INTEGER, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: true },
  assigned_to: { type: DataTypes.INTEGER, allowNull: true },
  resolution: { type: DataTypes.TEXT, allowNull: true },
  satisfaction: { type: DataTypes.FLOAT, defaultValue: 0 },
  sla_minutes: { type: DataTypes.INTEGER, defaultValue: 1440 },
  comments: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'tickets' });

const TicketComment = sequelize.define('ticket_comments', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ticket_id: { type: DataTypes.INTEGER, allowNull: false },
  author_id: { type: DataTypes.INTEGER, allowNull: true },
  content: { type: DataTypes.TEXT, allowNull: true },
  type: {
    type: DataTypes.ENUM('note', 'reply', 'internal'),
    allowNull: false,
    defaultValue: 'note',
  },
}, { tableName: 'ticket_comments' });

const CallRecord = sequelize.define('call_records', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  direction: {
    type: DataTypes.ENUM('inbound', 'outbound'),
    allowNull: false,
    defaultValue: 'inbound',
  },
  customer_phone: { type: DataTypes.STRING(30), allowNull: true },
  customer_name: { type: DataTypes.STRING(100), allowNull: true },
  agent_id: { type: DataTypes.INTEGER, allowNull: true },
  status: {
    type: DataTypes.ENUM('connected', 'missed', 'failed'),
    allowNull: false,
    defaultValue: 'connected',
  },
  start_time: { type: DataTypes.DATE, allowNull: true },
  end_time: { type: DataTypes.DATE, allowNull: true },
  duration: { type: DataTypes.INTEGER, defaultValue: 0 },
  recording_url: { type: DataTypes.STRING(500), allowNull: true },
  call_id: { type: DataTypes.STRING(100), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  ticket_id: { type: DataTypes.INTEGER, allowNull: true },
  customer_id: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'call_records' });

const SystemConfig = sequelize.define('system_configs', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  key: { type: DataTypes.STRING(100), unique: true, allowNull: false },
  value: { type: DataTypes.TEXT, allowNull: true },
  description: { type: DataTypes.STRING(255), allowNull: true },
}, { tableName: 'system_configs' });

// ==================== 关联 ====================
User.hasMany(Order, { foreignKey: 'created_by', as: 'orders' });
User.hasMany(Ticket, { foreignKey: 'assigned_to', as: 'assignedTickets' });
User.hasMany(Ticket, { foreignKey: 'created_by', as: 'createdTickets' });
User.hasMany(CallRecord, { foreignKey: 'agent_id', as: 'calls' });
User.hasMany(TicketComment, { foreignKey: 'author_id', as: 'ticketComments' });

Customer.hasMany(Order, { foreignKey: 'customer_id', as: 'orders' });
Customer.hasMany(Ticket, { foreignKey: 'customer_id', as: 'tickets' });
Customer.hasMany(CallRecord, { foreignKey: 'customer_id', as: 'calls' });

Order.hasMany(Ticket, { foreignKey: 'order_id', as: 'tickets' });
Order.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
Order.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

Ticket.hasMany(TicketComment, { foreignKey: 'ticket_id', as: 'commentList' });
Ticket.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
Ticket.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
Ticket.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });
Ticket.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

TicketComment.belongsTo(Ticket, { foreignKey: 'ticket_id', as: 'ticket' });
TicketComment.belongsTo(User, { foreignKey: 'author_id', as: 'author' });

CallRecord.belongsTo(User, { foreignKey: 'agent_id', as: 'agent' });
CallRecord.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
CallRecord.belongsTo(Ticket, { foreignKey: 'ticket_id', as: 'ticket' });

// ==================== 分页辅助 ====================
async function paginate(Model, options = {}) {
  const { page = 1, pageSize = 20, where = {}, order = [['created_at', 'DESC']], include } = options;
  const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 500);
  const offset = (parseInt(page, 10) - 1) * limit;
  const result = await Model.findAndCountAll({
    where,
    order,
    limit,
    offset,
    include,
  });
  const pages = Math.ceil(result.count / limit) || 1;
  return {
    rows: result.rows.map(toPlain),
    items: result.rows.map(toPlain),
    count: result.count,
    total: result.count,
    page: parseInt(page, 10),
    pageSize: limit,
    pages,
  };
}

// ==================== 初始化数据库 ====================
async function initDatabase({ force = false, alter = false } = {}) {
  try {
    await sequelize.authenticate();
    console.log(`✓ 数据库连接成功: ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
    await sequelize.sync({ force, alter });
    console.log('✓ 模型同步完成');
    return true;
  } catch (err) {
    console.error('✗ 数据库初始化失败:', err.message);
    return false;
  }
}

// ==================== 种子数据 ====================
async function seedData() {
  const t = await sequelize.transaction();
  try {
    // 管理员 & 主管
    const hashed = bcrypt.hashSync('123456', 10);
    const [admin] = await User.findOrCreate({
      where: { username: 'admin' },
      defaults: { username: 'admin', password: hashed, real_name: '系统管理员', role: 'admin', phone: '13800000000', status: 'active' },
      transaction: t,
    });
    const [manager] = await User.findOrCreate({
      where: { username: 'manager' },
      defaults: { username: 'manager', password: hashed, real_name: '张主管', role: 'manager', phone: '13800000001', status: 'active' },
      transaction: t,
    });

    const agentNames = ['王丽', '李娜', '刘芳', '陈强', '杨静', '黄磊', '赵敏', '周涛', '吴倩', '徐伟',
      '孙丽', '马超', '朱婷', '郭鹏', '何琳', '高翔', '林华', '罗勇', '宋梅', '郑浩'];
    const agents = [];
    for (let i = 0; i < agentNames.length; i++) {
      const [a] = await User.findOrCreate({
        where: { username: `agent${String(i + 1).padStart(2, '0')}` },
        defaults: {
          username: `agent${String(i + 1).padStart(2, '0')}`,
          password: hashed, real_name: agentNames[i], role: 'agent',
          phone: `138${String(1000000 + i * 1000).padStart(8, '0')}`, status: 'active',
        },
        transaction: t,
      });
      agents.push(a);
    }

    // 客户
    const customerNames = ['张先生', '李女士', '王经理', '陈阿姨', '刘师傅', '杨同学', '周老板', '吴总',
      '徐阿姨', '孙先生', '赵女士', '钱经理', '马阿姨', '朱老板', '胡同学', '郭师傅',
      '何经理', '高总', '林女士', '罗先生', '宋阿姨', '郑老板', '谢经理', '唐总',
      '韩先生', '冯女士', '董师傅', '萧阿姨', '程经理', '曹老板'];
    const cities = ['北京市朝阳区', '上海市浦东新区', '广州市天河区', '深圳市南山区', '成都市锦江区',
      '杭州市西湖区', '南京市鼓楼区', '武汉市武昌区', '西安市雁塔区', '重庆市渝中区'];
    const streets = ['建国路88号', '中山路123号', '人民路456号', '解放大道789号', '长安街100号',
      '光明路50号', '和平街200号', '胜利大道888号', '幸福路66号', '平安大街188号'];
    const tagsPool = ['VIP客户', '常投诉', '大客户', '偏远地址', '需电话确认', '已实名'];
    const customers = [];
    for (let i = 0; i < customerNames.length; i++) {
      const [c] = await Customer.findOrCreate({
        where: { phone: `139${String(1000000 + i * 137).padStart(8, '0')}` },
        defaults: {
          name: customerNames[i],
          phone: `139${String(1000000 + i * 137).padStart(8, '0')}`,
          address: `${cities[i % 10]}${streets[i % 10]}`,
          tags: `${tagsPool[i % 6]},${tagsPool[(i + 2) % 6]}`,
          vip: i % 5 === 0 ? 1 : 0,
          total_orders: Math.floor(Math.random() * 50) + 5,
          total_tickets: Math.floor(Math.random() * 5),
          notes: '',
          last_contact: new Date(Date.now() - Math.random() * 7 * 24 * 3600 * 1000),
        },
        transaction: t,
      });
      customers.push(c);
    }

    // 订单
    const couriers = ['sto', 'yto', 'zto', 'bestexpress', 'yunda', 'sf', 'ems'];
    const orderStatuses = ['pending', 'collected', 'transit', 'delivery', 'delivered', 'exception', 'returned'];
    for (let i = 0; i < 200; i++) {
      const cust = customers[i % customers.length];
      const ctime = new Date(Date.now() - Math.random() * 30 * 24 * 3600 * 1000);
      await Order.findOrCreate({
        where: { tracking_number: `${couriers[i % 7].toUpperCase()}${String(ctime.getTime()).slice(-8)}${String(i).padStart(4, '0')}` },
        defaults: {
          tracking_number: `${couriers[i % 7].toUpperCase()}${String(ctime.getTime()).slice(-8)}${String(i).padStart(4, '0')}`,
          courier: couriers[i % 7],
          sender_name: '发货商家', sender_phone: '400-000-0000', sender_address: cities[0],
          receiver_name: cust.name, receiver_phone: cust.phone, receiver_address: cust.address,
          weight: Math.round((Math.random() * 10 + 0.5) * 10) / 10,
          status: orderStatuses[Math.floor(Math.random() * orderStatuses.length)],
          estimated_delivery: new Date(ctime.getTime() + 3 * 24 * 3600 * 1000),
          customer_id: cust.id, created_by: agents[0].id,
          tracking_info: JSON.stringify([
            { time: new Date(ctime.getTime() + 3600000).toLocaleString('zh-CN'), status: '快件已揽收', location: cities[i % 10] },
            { time: new Date(ctime.getTime() + 6 * 3600000).toLocaleString('zh-CN'), status: '快件已发出', location: `${cities[i % 10]} 中转中心` },
            { time: new Date(ctime.getTime() + 18 * 3600000).toLocaleString('zh-CN'), status: '快件到达', location: cities[(i + 3) % 10] },
          ]),
          created_at: ctime, updated_at: ctime,
        },
        transaction: t,
      });
    }

    // 工单
    const ticketTypes = ['complaint', 'query', 'service', 'claim', 'other'];
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const ticketStatuses = ['open', 'assigned', 'processing', 'waiting', 'resolved', 'closed'];
    const subjects = ['查询包裹物流状态', '快件一直未送达', '包装破损要求赔偿', '需要修改收货地址',
      '派送员态度差', '快件丢失索赔', '签收但未收到', '催件加急处理',
      '拒收后退款', '收件人信息错误', '包裹损坏', '物流信息长时间未更新',
      '要求退件', '派送地址无人', '预约送货时间', '投诉客服态度'];
    for (let i = 0; i < 80; i++) {
      const cust = customers[i % customers.length];
      const agent = agents[i % agents.length];
      const status = ticketStatuses[Math.floor(Math.random() * ticketStatuses.length)];
      const ctime = new Date(Date.now() - Math.random() * 15 * 24 * 3600 * 1000);
      await Ticket.create({
        title: subjects[i % subjects.length],
        type: ticketTypes[i % ticketTypes.length],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        status,
        description: `客户来电反映问题：${subjects[i % subjects.length]}。请尽快核实并回复客户。`,
        customer_id: cust.id,
        created_by: agent.id,
        assigned_to: status === 'open' ? null : agent.id,
        resolution: ['closed', 'resolved'].includes(status) ? '已联系客户处理，问题已解决' : null,
        satisfaction: ['closed', 'resolved'].includes(status) ? Math.floor(Math.random() * 2) + 4 : 0,
        sla_minutes: 1440,
        created_at: ctime, updated_at: ctime,
      }, { transaction: t });
    }

    // 通话记录
    const callStatuses = ['connected', 'missed', 'failed'];
    for (let i = 0; i < 150; i++) {
      const cust = customers[i % customers.length];
      const agent = agents[i % agents.length];
      const status = callStatuses[Math.floor(Math.random() * callStatuses.length)];
      const startTime = new Date(Date.now() - Math.random() * 7 * 24 * 3600 * 1000);
      const duration = status === 'connected' ? Math.floor(Math.random() * 300) + 30 : 0;
      await CallRecord.create({
        direction: i % 3 === 0 ? 'inbound' : 'outbound',
        customer_phone: cust.phone, customer_name: cust.name,
        agent_id: agent.id, status,
        start_time: startTime,
        end_time: new Date(startTime.getTime() + duration * 1000),
        duration, call_id: `CALL${String(startTime.getTime()).slice(-10)}${String(i).padStart(4, '0')}`,
        notes: status === 'connected' ? `${cust.name}来电咨询订单问题，${agent.real_name}客服耐心解答。` : null,
        customer_id: cust.id,
        created_at: startTime, updated_at: startTime,
      }, { transaction: t });
    }

    // 系统配置
    const defaultConfigs = [
      { key: 'site.name', value: '快递网点客服系统', description: '站点名称' },
      { key: 'ticket.sla.minutes', value: '1440', description: '工单 SLA 分钟数' },
      { key: 'call.center.provider', value: 'mock', description: '呼叫中心供应商' },
      { key: 'ai.provider', value: 'local', description: 'AI 供应商' },
    ];
    for (const c of defaultConfigs) {
      await SystemConfig.findOrCreate({ where: { key: c.key }, defaults: c, transaction: t });
    }

    await t.commit();
    console.log('✓ 种子数据写入完成');
    return true;
  } catch (err) {
    await t.rollback();
    console.error('✗ 种子数据写入失败:', err.message);
    return false;
  }
}

// ==================== 导出 ====================
module.exports = {
  sequelize,
  Op,
  DataTypes,
  QueryTypes,
  User,
  Customer,
  Order,
  Ticket,
  TicketComment,
  CallRecord,
  SystemConfig,
  paginate,
  toPlain,
  camelCase,
  initDatabase,
  seedData,
  bcrypt,
};
