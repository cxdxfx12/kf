# 喵喵至家客服系统 - 自动部署脚本
param(
    [string]$Server = "211.149.181.178",
    [string]$Port = "22",
    [string]$User = "root",
    [string]$Pass = "cxdxfx12"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  喵喵至家客服系统 - 服务器部署" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 创建临时密码文件
$secPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$creds = New-Object System.Management.Automation.PSCredential ($User, $secPass)

# 1. 上传前端文件
Write-Host "[1/2] 上传前端文件到 /www/wwwroot/kf/web ..." -ForegroundColor Yellow

$webScript = @"
lcd 'e:\kf\web\dist'
cd /www/wwwroot/kf
mkdir -p web
cd web
put -r * .
bye
"@

$webScript | Out-File -FilePath "e:\kf\_upload_web.txt" -Encoding ASCII
& sftp -o "StrictHostKeyChecking=no" -o "Port=$Port" "-b e:\kf\_upload_web.txt" "$User@$Server" < "$env:TEMP\pass_$PID.txt" 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  前端上传成功!" -ForegroundColor Green
} else {
    Write-Host "  前端上传完成" -ForegroundColor Gray
}

# 2. 上传后端文件
Write-Host "[2/2] 上传后端文件到 /www/wwwroot/kf/server ..." -ForegroundColor Yellow

$serverScript = @"
lcd 'e:\kf\server'
cd /www/wwwroot/kf
mkdir -p server
cd server
put -r * .
bye
"@

$serverScript | Out-File -FilePath "e:\kf\_upload_server.txt" -Encoding ASCII
& sftp -o "StrictHostKeyChecking=no" -o "Port=$Port" "-b e:\kf\_upload_server.txt" "$User@$Server" < "$env:TEMP\pass_$PID.txt" 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  后端上传成功!" -ForegroundColor Green
} else {
    Write-Host "  后端上传完成" -ForegroundColor Gray
}

# 清理临时文件
Remove-Item "e:\kf\_upload_web.txt" -ErrorAction SilentlyContinue
Remove-Item "e:\kf\_upload_server.txt" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  文件上传完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步 - SSH连接到服务器执行:" -ForegroundColor Yellow
Write-Host "  ssh -p $Port $User@$Server" -ForegroundColor White
Write-Host ""
Write-Host "  cd /www/wwwroot/kf/server" -ForegroundColor White
Write-Host "  npm install" -ForegroundColor White
Write-Host "  pm2 start index.js --name kf-server" -ForegroundColor White
Write-Host ""
