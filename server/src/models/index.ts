import { Sequelize, DataTypes } from 'sequelize';
import { config } from '../config';

export const sequelize = new Sequelize({
  dialect: config.database.dialect as any,
  host: config.database.host,
  port: Number(config.database.port) || 3306,
  database: config.database.database,
  username: config.database.username,
  password: config.database.password,
  logging: false,
  define: { timestamps: true, underscored: true },
  pool: { max: 20, min: 2, acquire: 60000, idle: 60000 },
});

// ===== 用户 =====
export const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING(50), unique: true, allowNull: false },
  password: { type: DataTypes.STRING(255), allowNull: false },
  realName: { type: DataTypes.STRING(50), allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'manager', 'agent'), defaultValue: 'agent' },
  phone: { type: DataTypes.STRING(20), allowNull: false },
  email: { type: DataTypes.STRING(100) },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
  totalCalls: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalTickets: { type: DataTypes.INTEGER, defaultValue: 0 },
  avgHandleTime: { type: DataTypes.FLOAT, defaultValue: 0 },
  satisfaction: { type: DataTypes.FLOAT, defaultValue: 0 },
}, { tableName: 'users' });

// ===== 客户 =====
export const Customer = sequelize.define('Customer', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  phone: { type: DataTypes.STRING(20), unique: true, allowNull: false },
  address: { type: DataTypes.STRING(500), allowNull: false },
  email: { type: DataTypes.STRING(100) },
  tags: { type: DataTypes.STRING(500) },
  vip: { type: DataTypes.BOOLEAN, defaultValue: false },
  totalOrders: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalTickets: { type: DataTypes.INTEGER, defaultValue: 0 },
  lastContact: { type: DataTypes.DATE },
  notes: { type: DataTypes.TEXT },
}, { tableName: 'customers' });

// ===== 订单 =====
export const Order = sequelize.define('Order', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  trackingNumber: { type: DataTypes.STRING(50), unique: true, allowNull: false },
  courier: { type: DataTypes.STRING(50), allowNull: false },
  senderName: { type: DataTypes.STRING(100), allowNull: false },
  senderPhone: { type: DataTypes.STRING(20), allowNull: false },
  senderAddress: { type: DataTypes.STRING(500), allowNull: false },
  receiverName: { type: DataTypes.STRING(100), allowNull: false },
  receiverPhone: { type: DataTypes.STRING(20), allowNull: false },
  receiverAddress: { type: DataTypes.STRING(500), allowNull: false },
  weight: { type: DataTypes.FLOAT, defaultValue: 1 },
  status: { type: DataTypes.ENUM('pending', 'collected', 'transit', 'delivery', 'delivered', 'exception', 'returned'), defaultValue: 'pending' },
  estimatedDelivery: { type: DataTypes.DATE },
  actualDelivery: { type: DataTypes.DATE },
  trackingInfo: { type: DataTypes.TEXT },
  customerId: { type: DataTypes.INTEGER, references: { model: 'customers', key: 'id' } },
  createdBy: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
}, { tableName: 'orders' });

// ===== 工单 =====
export const Ticket = sequelize.define('Ticket', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  type: { type: DataTypes.ENUM('complaint', 'query', 'service', 'claim', 'other'), allowNull: false },
  priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'), defaultValue: 'medium' },
  status: { type: DataTypes.ENUM('open', 'assigned', 'processing', 'waiting', 'resolved', 'closed'), defaultValue: 'open' },
  description: { type: DataTypes.TEXT, allowNull: false },
  orderId: { type: DataTypes.INTEGER },
  customerId: { type: DataTypes.INTEGER },
  createdBy: { type: DataTypes.INTEGER, allowNull: false },
  assignedTo: { type: DataTypes.INTEGER },
  resolution: { type: DataTypes.TEXT },
  satisfaction: { type: DataTypes.FLOAT },
  slaMinutes: { type: DataTypes.INTEGER, defaultValue: 240 },
  comments: { type: DataTypes.TEXT },
}, { tableName: 'tickets' });

// ===== 工单备注 =====
export const TicketComment = sequelize.define('TicketComment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ticketId: { type: DataTypes.INTEGER, allowNull: false },
  authorId: { type: DataTypes.INTEGER, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.ENUM('note', 'reply', 'internal'), defaultValue: 'note' },
}, { tableName: 'ticket_comments' });

// ===== 通话记录 =====
export const CallRecord = sequelize.define('CallRecord', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  direction: { type: DataTypes.ENUM('inbound', 'outbound'), allowNull: false },
  customerPhone: { type: DataTypes.STRING(20), allowNull: false },
  customerName: { type: DataTypes.STRING(100), allowNull: false },
  agentId: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM('connected', 'missed', 'failed'), defaultValue: 'connected' },
  startTime: { type: DataTypes.DATE, allowNull: false },
  endTime: { type: DataTypes.DATE },
  duration: { type: DataTypes.INTEGER, defaultValue: 0 },
  recordingUrl: { type: DataTypes.STRING(500) },
  callId: { type: DataTypes.STRING(100) },
  notes: { type: DataTypes.TEXT },
  ticketId: { type: DataTypes.INTEGER },
  customerId: { type: DataTypes.INTEGER },
}, { tableName: 'call_records' });

// ===== 系统配置 =====
export const SystemConfig = sequelize.define('SystemConfig', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  key: { type: DataTypes.STRING(100), unique: true, allowNull: false },
  value: { type: DataTypes.TEXT, allowNull: false },
  description: { type: DataTypes.STRING(500) },
}, { tableName: 'system_configs' });

// 关联
Order.belongsTo(Customer, { as: 'customer', foreignKey: 'customerId' });
Customer.hasMany(Order, { foreignKey: 'customerId' });
Ticket.belongsTo(Customer, { as: 'customer', foreignKey: 'customerId' });
Ticket.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });
Ticket.belongsTo(User, { as: 'assignee', foreignKey: 'assignedTo' });
Ticket.belongsTo(Order, { as: 'order', foreignKey: 'orderId' });
Ticket.hasMany(TicketComment, { as: 'thread', foreignKey: 'ticketId' });
TicketComment.belongsTo(User, { as: 'author', foreignKey: 'authorId' });
CallRecord.belongsTo(User, { as: 'agent', foreignKey: 'agentId' });
CallRecord.belongsTo(Customer, { as: 'customer', foreignKey: 'customerId' });
