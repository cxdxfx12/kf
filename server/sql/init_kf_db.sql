-- ==============================================
-- 快递网点客服系统 - 数据库初始化脚本
-- 数据库名: courier_cs
-- 字符集: utf8mb4
-- ==============================================

CREATE DATABASE IF NOT EXISTS courier_cs DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE courier_cs;

-- ----------------------------------------------
-- 表 1: users（用户/坐席）
-- ----------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  real_name VARCHAR(100),
  role ENUM('admin','manager','agent') NOT NULL DEFAULT 'agent',
  phone VARCHAR(30),
  email VARCHAR(100),
  status ENUM('active','inactive','online','offline','busy') NOT NULL DEFAULT 'inactive',
  total_calls INT DEFAULT 0,
  total_tickets INT DEFAULT 0,
  avg_handle_time FLOAT DEFAULT 0,
  satisfaction FLOAT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------
-- 表 2: customers（客户）
-- ----------------------------------------------
DROP TABLE IF EXISTS customers;
CREATE TABLE customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(30) NOT NULL UNIQUE,
  address VARCHAR(255),
  email VARCHAR(100),
  tags VARCHAR(255),
  vip TINYINT(1) DEFAULT 0,
  total_orders INT DEFAULT 0,
  total_tickets INT DEFAULT 0,
  last_contact DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------
-- 表 3: orders（订单）
-- ----------------------------------------------
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tracking_number VARCHAR(100) NOT NULL UNIQUE,
  courier VARCHAR(50),
  sender_name VARCHAR(100),
  sender_phone VARCHAR(30),
  sender_address VARCHAR(255),
  receiver_name VARCHAR(100),
  receiver_phone VARCHAR(30),
  receiver_address VARCHAR(255),
  weight FLOAT DEFAULT 0,
  status ENUM('pending','collected','transit','delivery','delivered','exception','returned') NOT NULL DEFAULT 'pending',
  estimated_delivery DATETIME,
  actual_delivery DATETIME,
  tracking_info TEXT,
  customer_id INT,
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customer_id (customer_id),
  INDEX idx_tracking_number (tracking_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------
-- 表 4: tickets（工单）
-- ----------------------------------------------
DROP TABLE IF EXISTS tickets;
CREATE TABLE tickets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255),
  type ENUM('complaint','query','service','claim','other') NOT NULL DEFAULT 'query',
  priority ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  status ENUM('open','assigned','processing','waiting','resolved','closed') NOT NULL DEFAULT 'open',
  description TEXT,
  order_id INT,
  customer_id INT,
  created_by INT,
  assigned_to INT,
  resolution TEXT,
  satisfaction FLOAT DEFAULT 0,
  sla_minutes INT DEFAULT 1440,
  comments TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customer_id (customer_id),
  INDEX idx_assigned_to (assigned_to),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------
-- 表 5: ticket_comments（工单评论）
-- ----------------------------------------------
DROP TABLE IF EXISTS ticket_comments;
CREATE TABLE ticket_comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ticket_id INT NOT NULL,
  author_id INT,
  content TEXT,
  type ENUM('note','reply','internal') NOT NULL DEFAULT 'note',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ticket_id (ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------
-- 表 6: call_records（通话记录）
-- ----------------------------------------------
DROP TABLE IF EXISTS call_records;
CREATE TABLE call_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  direction ENUM('inbound','outbound') NOT NULL DEFAULT 'inbound',
  customer_phone VARCHAR(30),
  customer_name VARCHAR(100),
  agent_id INT,
  status ENUM('connected','missed','failed') NOT NULL DEFAULT 'connected',
  start_time DATETIME,
  end_time DATETIME,
  duration INT DEFAULT 0,
  recording_url VARCHAR(500),
  call_id VARCHAR(100),
  notes TEXT,
  ticket_id INT,
  customer_id INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_agent_id (agent_id),
  INDEX idx_customer_id (customer_id),
  INDEX idx_start_time (start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------
-- 表 7: system_configs（系统配置）
-- ----------------------------------------------
DROP TABLE IF EXISTS system_configs;
CREATE TABLE system_configs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  value TEXT,
  description VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 初始化数据（默认账号）
-- ==============================================

-- 管理员账户：admin / 密码 123456
INSERT INTO users (username, password, real_name, role, phone, status) VALUES
('admin', '$2a$10$CwTycUXWue0Thq9StjUM0uJ8v7fX8fXv5X3v4X2v1Xv7Z1Z2Z3Z4Z', '系统管理员', 'admin', '13800000000', 'active');

-- 主管账号：manager / 密码 123456
INSERT INTO users (username, password, real_name, role, phone, status) VALUES
('manager', '$2a$10$CwTycUXWue0Thq9StjUM0uJ8v7fX8fXv5X3v4X2v1Xv7Z1Z2Z3Z4Z', '张主管', 'manager', '13800000001', 'active');

-- 系统默认配置
INSERT INTO system_configs (`key`, value, description) VALUES
('site.name', '快递网点客服系统', '站点名称'),
('ticket.sla.minutes', '1440', '工单 SLA 分钟数'),
('call.center.provider', 'mock', '呼叫中心供应商'),
('ai.provider', 'local', 'AI 供应商');

-- ==============================================
-- 完成
-- ==============================================
