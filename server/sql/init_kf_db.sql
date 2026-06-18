-- ============================================
-- 喵喵至家客服系统 - MySQL 数据库初始化脚本
-- ============================================
-- 
-- 使用方式：
-- 1. 登录 MySQL: mysql -u root -p
-- 2. 选择数据库: USE 你的数据库名;
-- 3. 执行本脚本: SOURCE init_kf_db.sql;
-- 或者直接执行: mysql -u root -p 你的数据库名 < init_kf_db.sql
--

-- 创建数据库（如果不存在）
-- CREATE DATABASE IF NOT EXISTS kf_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE kf_db;

-- ============================================
-- 1. 用户表 (users)
-- ============================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '登录账号',
  `password` VARCHAR(255) NOT NULL COMMENT '密码（加密）',
  `realName` VARCHAR(50) COMMENT '真实姓名',
  `role` ENUM('admin', 'manager', 'agent') DEFAULT 'agent' COMMENT '角色：admin-管理员，manager-主管，agent-坐席',
  `phone` VARCHAR(20) COMMENT '手机号',
  `email` VARCHAR(100) COMMENT '邮箱',
  `status` TINYINT DEFAULT 1 COMMENT '状态：1-正常，0-禁用',
  `lastLoginAt` DATETIME COMMENT '最后登录时间',
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`),
  INDEX `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ============================================
-- 2. 客户表 (customers)
-- ============================================
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '客户姓名',
  `phone` VARCHAR(20) NOT NULL COMMENT '手机号',
  `address` VARCHAR(255) COMMENT '收货地址',
  `expressCompany` VARCHAR(50) COMMENT '常用快递',
  `tags` VARCHAR(255) COMMENT '标签（逗号分隔）',
  `totalOrders` INT DEFAULT 0 COMMENT '总订单数',
  `totalComplaints` INT DEFAULT 0 COMMENT '投诉次数',
  `vipLevel` TINYINT DEFAULT 0 COMMENT 'VIP等级：0-普通，1-银卡，2-金卡，3-黑金',
  `remark` TEXT COMMENT '备注',
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_phone` (`phone`),
  INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户表';

-- ============================================
-- 3. 订单表 (orders)
-- ============================================
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `orderNo` VARCHAR(50) NOT NULL UNIQUE COMMENT '订单号',
  `expressNo` VARCHAR(50) COMMENT '快递单号',
  `expressCompany` VARCHAR(50) COMMENT '快递公司',
  `senderName` VARCHAR(100) COMMENT '寄件人',
  `senderPhone` VARCHAR(20) COMMENT '寄件人电话',
  `senderAddress` VARCHAR(255) COMMENT '寄件人地址',
  `receiverName` VARCHAR(100) COMMENT '收件人',
  `receiverPhone` VARCHAR(20) COMMENT '收件人电话',
  `receiverAddress` VARCHAR(255) COMMENT '收件人地址',
  `weight` DECIMAL(10,2) COMMENT '重量(kg)',
  `freight` DECIMAL(10,2) COMMENT '运费',
  `status` ENUM('pending', 'picked', 'in_transit', 'delivered', 'returned', 'cancelled') DEFAULT 'pending' COMMENT '状态',
  `customerId` INT COMMENT '关联客户ID',
  `remark` TEXT COMMENT '备注',
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_orderNo` (`orderNo`),
  INDEX `idx_expressNo` (`expressNo`),
  INDEX `idx_status` (`status`),
  INDEX `idx_receiverPhone` (`receiverPhone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- ============================================
-- 4. 工单表 (tickets)
-- ============================================
CREATE TABLE IF NOT EXISTS `tickets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticketNo` VARCHAR(50) NOT NULL UNIQUE COMMENT '工单编号',
  `title` VARCHAR(255) NOT NULL COMMENT '工单标题',
  `type` ENUM('lost', 'damaged', 'delayed', 'attitude', 'wrong_address', 'refund', 'complaint', 'other') DEFAULT 'other' COMMENT '类型',
  `priority` ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' COMMENT '优先级',
  `status` ENUM('open', 'processing', 'pending', 'resolved', 'closed') DEFAULT 'open' COMMENT '状态',
  `customerId` INT COMMENT '关联客户ID',
  `customerName` VARCHAR(100) COMMENT '客户姓名',
  `customerPhone` VARCHAR(20) COMMENT '客户电话',
  `orderId` INT COMMENT '关联订单ID',
  `orderNo` VARCHAR(50) COMMENT '订单号',
  `expressNo` VARCHAR(50) COMMENT '快递单号',
  `assignedTo` INT COMMENT '分配给(坐席ID)',
  `assignedName` VARCHAR(50) COMMENT '分配给(坐席姓名)',
  `description` TEXT COMMENT '问题描述',
  `aiAnalysis` TEXT COMMENT 'AI分析结果(JSON)',
  `aiAutoProcess` TINYINT DEFAULT 0 COMMENT '是否AI自动处理',
  `resolution` TEXT COMMENT '处理结果',
  `closedAt` DATETIME COMMENT '关闭时间',
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_ticketNo` (`ticketNo`),
  INDEX `idx_type` (`type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_customerPhone` (`customerPhone`),
  INDEX `idx_assignedTo` (`assignedTo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工单表';

-- ============================================
-- 5. 工单评论表 (ticket_comments)
-- ============================================
CREATE TABLE IF NOT EXISTS `ticket_comments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticketId` INT NOT NULL COMMENT '工单ID',
  `content` TEXT NOT NULL COMMENT '评论内容',
  `authorId` INT COMMENT '评论人ID',
  `authorName` VARCHAR(50) COMMENT '评论人姓名',
  `type` ENUM('comment', 'system') DEFAULT 'comment' COMMENT '类型：comment-评论，system-系统消息',
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ticketId` (`ticketId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工单评论表';

-- ============================================
-- 6. 通话记录表 (calls)
-- ============================================
CREATE TABLE IF NOT EXISTS `calls` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `callId` VARCHAR(100) UNIQUE COMMENT '通话ID',
  `direction` ENUM('inbound', 'outbound') DEFAULT 'inbound' COMMENT '方向：inbound-来电，outbound-外呼',
  `caller` VARCHAR(50) COMMENT '主叫号码',
  `callee` VARCHAR(50) COMMENT '被叫号码',
  `status` ENUM('pending', 'ringing', 'connected', 'missed', 'failed', 'busy') DEFAULT 'pending' COMMENT '状态',
  `duration` INT DEFAULT 0 COMMENT '通话时长(秒)',
  `agentId` INT COMMENT '坐席ID',
  `agentName` VARCHAR(50) COMMENT '坐席姓名',
  `recordingUrl` VARCHAR(255) COMMENT '录音URL',
  `transcript` TEXT COMMENT '语音转文字',
  `aiAnalysis` TEXT COMMENT 'AI分析结果(JSON)',
  `ticketId` INT COMMENT '关联工单ID',
  `startTime` DATETIME COMMENT '开始时间',
  `endTime` DATETIME COMMENT '结束时间',
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_callId` (`callId`),
  INDEX `idx_direction` (`direction`),
  INDEX `idx_status` (`status`),
  INDEX `idx_agentId` (`agentId`),
  INDEX `idx_caller` (`caller`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通话记录表';

-- ============================================
-- 7. 系统配置表 (system_configs)
-- ============================================
CREATE TABLE IF NOT EXISTS `system_configs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
  `value` TEXT COMMENT '配置值',
  `description` VARCHAR(255) COMMENT '配置描述',
  `category` VARCHAR(50) DEFAULT 'general' COMMENT '分类',
  `updatedBy` INT COMMENT '最后更新人',
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_key` (`key`),
  INDEX `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

-- ============================================
-- 初始化数据
-- ============================================

-- 插入默认管理员账号 (密码: 123456)
INSERT INTO `users` (`username`, `password`, `realName`, `role`, `phone`, `status`) VALUES
('admin', '123456', '系统管理员', 'admin', '13800138000', 1),
('agent1', '123456', '张三', 'agent', '13800138001', 1),
('agent2', '123456', '李四', 'agent', '13800138002', 1),
('agent3', '123456', '王五', 'agent', '13800138003', 1),
('agent4', '123456', '赵六', 'agent', '13800138004', 1),
('agent5', '123456', '钱七', 'agent', '13800138005', 1),
('agent6', '123456', '孙八', 'agent', '13800138006', 1),
('manager', '123456', '主管', 'manager', '13800138007', 1);

-- 插入示例客户
INSERT INTO `customers` (`name`, `phone`, `address`, `expressCompany`, `tags`, `vipLevel`) VALUES
('张三', '13900001111', '浙江省杭州市西湖区文三路123号', '申通', 'VIP,大客户', 2),
('李四', '13900002222', '浙江省杭州市滨江区长河路456号', '圆通', '普通', 0),
('王五', '13900003333', '浙江省杭州市拱墅区延安路789号', '中通', '活跃', 1);

-- 插入示例工单
INSERT INTO `tickets` (`ticketNo`, `title`, `type`, `priority`, `status`, `customerName`, `customerPhone`, `description`) VALUES
('TK20240618001', '快递丢失投诉', 'lost', 'high', 'open', '张三', '13900001111', '等了3天还没收到快递，物流显示已签收但我没收到'),
('TK20240618002', '包装破损', 'damaged', 'medium', 'processing', '李四', '13900002222', '收到的包裹外包装破损，里面商品也损坏了'),
('TK20240618003', '派送延迟', 'delayed', 'low', 'resolved', '王五', '13900003333', '比预计时间晚到了2天');

-- 插入示例系统配置
INSERT INTO `system_configs` (`key`, `value`, `description`, `category`) VALUES
('siteName', '杭州喵喵至家网络有限公司', '站点名称', 'site'),
('callCenterEnabled', 'false', '是否启用呼叫中心', 'callCenter'),
('aiAnalysisEnabled', 'true', '是否启用AI分析', 'ai'),
('expressApiEnabled', 'false', '是否启用快递API', 'express');

SELECT '数据库初始化完成!' AS result;
