# 部署配置
$server = "211.149.181.178"
$port = 22
$username = "root"
$password = "cxdxfx12"
$remotePath = "/www/wwwroot/kf"

# 本地路径
$localDistPath = "e:\kf\web\dist"
$localServerPath = "e:\kf\server"

# 生成部署包
Write-Host "正在生成部署包..." -ForegroundColor Cyan
$deployDir = "e:\kf\deploy_package"
if (Test-Path $deployDir) { Remove-Item $deployDir -Recurse -Force }
New-Item -ItemType Directory -Path $deployDir -Force | Out-Null

# 复制前端构建文件
Copy-Item -Path "$localDistPath\*" -Destination "$deployDir\web\" -Recurse -Force
New-Item -ItemType Directory -Path "$deployDir\web" -Force | Out-Null
Copy-Item -Path "$localDistPath\*" -Destination "$deployDir\web" -Recurse -Force

# 复制后端文件（排除 node_modules）
Write-Host "正在打包后端文件..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path "$deployDir\server" -Force | Out-Null
Get-ChildItem -Path $localServerPath -Recurse | Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "\.git" } | ForEach-Object {
    $relativePath = $_.FullName.Substring($localServerPath.Length)
    $destPath = "$deployDir\server$relativePath"
    if ($_.PSIsContainer) {
        New-Item -ItemType Directory -Path $destPath -Force | Out-Null
    } else {
        $destFolder = Split-Path $destPath -Parent
        if (!(Test-Path $destFolder)) { New-Item -ItemType Directory -Path $destFolder -Force | Out-Null }
        Copy-Item $_.FullName -Destination $destPath -Force
    }
}

# 复制必要配置文件
Copy-Item "e:\kf\.gitignore" -Destination "$deployDir" -Force
Copy-Item "e:\kf\package.json" -Destination "$deployDir" -Force
Copy-Item "e:\kf\start.bat" -Destination "$deployDir" -Force

Write-Host "部署包已生成: $deployDir" -ForegroundColor Green
Write-Host "请手动使用 SFTP 上传到服务器: $remotePath" -ForegroundColor Yellow
Write-Host ""
Write-Host "SFTP 连接命令:" -ForegroundColor Cyan
Write-Host "sftp -P $port $username@$server" -ForegroundColor White
Write-Host ""
Write-Host "上传后请执行以下命令安装依赖:" -ForegroundColor Yellow
Write-Host "cd $remotePath" -ForegroundColor White
Write-Host "cd server && npm install && cd .." -ForegroundColor White
Write-Host "pm2 start server/index.js --name kf-server" -ForegroundColor White
Write-Host ""
Write-Host "前端文件上传到: $remotePath/web/" -ForegroundColor Cyan
Write-Host "后端文件上传到: $remotePath/server/" -ForegroundColor Cyan
