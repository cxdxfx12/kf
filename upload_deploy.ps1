# SFTP 上传配置
$server = "211.149.181.178"
$port = 22
$username = "root"
$password = "cxdxfx12"
$remotePath = "/www/wwwroot/kf"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  喵喵至家客服系统 - SFTP部署脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 创建 SFTP 命令文件
$sftpCommands = @"
lcd e:\kf\web\dist
cd $remotePath
mkdir web
cd web
put -r *
bye
"@

Write-Host "[1/2] 上传前端文件到 $remotePath/web ..." -ForegroundColor Yellow
$sftpCommands | Out-File -FilePath "e:\kf\sftp_commands.txt" -Encoding ASCII

# 执行 SFTP 上传
try {
    $sftpResult = Write-Output $password | & sftp -o "StrictHostKeyChecking=no" -o "Port=$port" "$username@$server" -b "e:\kf\sftp_commands.txt" 2>&1
    Write-Host "前端上传结果: $sftpResult" -ForegroundColor Gray
    Write-Host "前端上传完成!" -ForegroundColor Green
} catch {
    Write-Host "前端上传失败: $_" -ForegroundColor Red
}

# 创建后端上传命令
Write-Host ""
Write-Host "[2/2] 上传后端文件到 $remotePath/server ..." -ForegroundColor Yellow

$sftpCommands2 = @"
lcd e:\kf\server
cd $remotePath
mkdir server
cd server
put -r *
put -r src
put index.js
put package.json
put tsconfig.json
mkdir routes
cd routes
put -r routes\*.ts
mkdir services
cd services
put -r services\*.ts
mkdir models
cd models
put -r models\*.ts
mkdir middleware
cd middleware
put -r middleware\*.ts
bye
"@

$sftpCommands2 | Out-File -FilePath "e:\kf\sftp_commands2.txt" -Encoding ASCII

try {
    $sftpResult2 = Write-Output $password | & sftp -o "StrictHostKeyChecking=no" -o "Port=$port" "$username@$server" -b "e:\kf\sftp_commands2.txt" 2>&1
    Write-Host "后端上传结果: $sftpResult2" -ForegroundColor Gray
    Write-Host "后端上传完成!" -ForegroundColor Green
} catch {
    Write-Host "后端上传失败: $_" -ForegroundColor Red
}

# 清理临时文件
Remove-Item "e:\kf\sftp_commands.txt" -ErrorAction SilentlyContinue
Remove-Item "e:\kf\sftp_commands2.txt" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  部署包上传完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步操作（SSH连接到服务器执行）:" -ForegroundColor Yellow
Write-Host "  ssh -p $port $username@$server" -ForegroundColor White
Write-Host ""
Write-Host "  # 安装后端依赖" -ForegroundColor White
Write-Host "  cd $remotePath/server" -ForegroundColor White
Write-Host "  npm install" -ForegroundColor White
Write-Host ""
Write-Host "  # 启动后端服务（使用 PM2）" -ForegroundColor White
Write-Host "  pm2 start index.js --name kf-server" -ForegroundColor White
Write-Host ""
Write-Host "  # 或使用 PM2 守护" -ForegroundColor White
Write-Host "  pm2 save" -ForegroundColor White
Write-Host "  pm2 startup" -ForegroundColor White
Write-Host ""
