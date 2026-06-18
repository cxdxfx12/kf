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

## 三、后端部署

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

# 数据库配置（如果是共享数据库）
DB_HOST=localhost
DB_PORT=3306
DB_USER=你的数据库用户
DB_PASS=你的数据库密码
DB_NAME=你的数据库名

# 如果是独立数据库，创建新的
# DB_NAME=kf_db

# JWT 密钥
JWT_SECRET=your_secret_key_change_this

# Azure 配置（可选）
AZURE_CONNECTION_STRING=your_azure_connection_string
AZURE_SPEECH_KEY=your_speech_key
DASHSCOPE_API_KEY=your_dashscope_key
EOF

# 4. 初始化数据库（如果需要）
# npm run seed
# 或者运行数据库迁移脚本

# 5. 安装 PM2 并启动
npm install -g pm2
pm2 start index.js --name kf-server

# 6. 设置开机自启
pm2 save
pm2 startup

# 7. 查看状态
pm2 status
pm2 logs kf-server
```

---

## 四、访问地址

部署完成后，访问：
```
http://www.hbdxm.com/kf/
```

登录信息：
- 管理员账号：`admin`
- 密码：`123456`

---

## 五、故障排查

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

## 六、目录结构

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

## 七、常用命令

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
