# 喵喵至家客服系统 - 部署指南
# 与现有 ThinkPHP + Vue 网站共存

## 一、文件上传

使用 WinSCP 或 FileZilla 连接服务器：

**服务器信息：**
- 主机名：`211.149.181.178`
- 端口：`22`
- 用户名：`root`
- 密码：`cxdxfx12`

**上传目录：**
```
本地: e:\kf\web\dist\*     → 服务器: /www/wwwroot/kf/web/
本地: e:\kf\server\*       → 服务器: /www/wwwroot/kf/server/
```

---

## 二、Nginx 配置

在现有网站的 Nginx 配置中添加以下内容：

### 方法1：编辑现有配置

```bash
# 编辑 Nginx 配置
vi /etc/nginx/sites-available/default
# 或
vi /www/server/nginx/conf/vhost/你的网站.conf
```

在 `server {}` 块中添加：

```nginx
# 客服系统前端
location /kf/ {
    alias /www/wwwroot/kf/web/;
    try_files $uri $uri/ /kf/index.html;
}

# 客服系统后端 API
location /kf/api/ {
    proxy_pass http://127.0.0.1:3000/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

### 方法2：宝塔面板配置

1. 登录宝塔面板
2. 找到现有网站，点击「设置」
3. 点击「配置文件」
4. 在适当位置添加上述配置
5. 保存并重载 Nginx

---

## 三、数据库配置

客服系统支持两种数据库模式：

### 方式一：JSON文件存储（默认，无需配置）

系统默认使用 JSON 文件存储数据，无需安装 MySQL。
- 数据存储位置：`/www/wwwroot/kf/server/data/db.json`
- 自动创建，初始包含示例数据

### 方式二：使用 MySQL（可选）

如果您想使用 MySQL：

```bash
# 1. 连接 MySQL
mysql -u root -p

# 2. 创建数据库
CREATE DATABASE kf_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kf_db;

# 3. 执行初始化脚本
SOURCE /www/wwwroot/kf/server/sql/init_kf_db.sql;

# 4. 退出 MySQL
EXIT;
```

初始化脚本会自动创建以下表和初始数据：
- `users` - 用户表（admin/agent1-6 默认密码：123456）
- `customers` - 客户表
- `orders` - 订单表
- `tickets` - 工单表
- `ticket_comments` - 工单评论表
- `calls` - 通话记录表
- `system_configs` - 系统配置表

---

## 四、后端部署

SSH 连接到服务器，执行以下命令：

```bash
# 1. 进入后端目录
cd /www/wwwroot/kf/server

# 2. 安装依赖
npm install

# 3. 配置环境变量
# 创建 .env 文件
cat > .env << EOF
NODE_ENV=production
PORT=3000

# JSON文件模式（默认）
# 不需要配置数据库

# MySQL模式（可选，取消注释并修改）
# DB_DIALECT=mysql
# DB_HOST=localhost
# DB_PORT=3306
# DB_NAME=kf_db
# DB_USER=你的数据库用户
# DB_PASS=你的数据库密码

# JWT 密钥
JWT_SECRET=your_secret_key_change_this

# Azure 配置（可选）
AZURE_CONNECTION_STRING=your_azure_connection_string
AZURE_SPEECH_KEY=your_speech_key
DASHSCOPE_API_KEY=your_dashscope_key
EOF

# 4. 安装 PM2 并启动
npm install -g pm2
pm2 start index.js --name kf-server

# 5. 设置开机自启
pm2 save
pm2 startup

# 6. 查看状态
pm2 status
pm2 logs kf-server
```

---

## 五、访问地址

部署完成后，访问：
```
http://www.hbdxm.com/kf/
```

登录信息：
- 管理员账号：`admin`
- 密码：`123456`

---

## 六、故障排查

### 1. 前端 404 问题
检查 Nginx 配置中的 `alias` 路径是否正确，确保 `/www/wwwroot/kf/web/` 目录存在且有文件。

### 2. API 请求失败
```bash
# 检查后端是否运行
pm2 status

# 检查端口是否监听
netstat -tlnp | grep 3000

# 查看日志
pm2 logs kf-server
```

### 3. 数据库连接失败
```bash
# 检查 MySQL
mysql -u root -p

# 创建数据库（如果是独立数据库）
CREATE DATABASE kf_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 七、目录结构

```
/www/wwwroot/
├── hbdxm/           # 现有网站
│   ├── public/
│   ├── app/
│   └── ...
│
└── kf/              # 客服系统（新）
    ├── web/         # 前端静态文件
    │   ├── index.html
    │   ├── assets/
    │   └── ...
    │
    └── server/      # 后端服务
        ├── index.js
        ├── package.json
        ├── src/
        ├── routes/
        ├── services/
        └── .env
```

---

## 八、常用命令

```bash
# 重启后端服务
pm2 restart kf-server

# 查看日志
pm2 logs kf-server --lines 100

# 重载 Nginx
nginx -t && nginx -s reload

# 或 宝塔面板重载
# 面板 → 软件商店 → Nginx → 重载配置
```
