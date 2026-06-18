# SFTP 上传脚本 - 使用 WinSCP
# 需要先安装 WinSCP 或使用其他 SFTP 客户端

$servers = @{
    Host = "211.149.181.178"
    Port = 22
    UserName = "root"
    Password = "cxdxfx12"
}

$remoteBase = "/www/wwwroot/kf"

# 检查 WinSCP 是否安装
$winscpPath = "C:\Program Files (x86)\WinSCP\WinSCP.com"
if (!(Test-Path $winscpPath)) {
    $winscpPath = "C:\Program Files\WinSCP\WinSCP.com"
}

if (Test-Path $winscpPath) {
    Write-Host "使用 WinSCP 上传..." -ForegroundColor Cyan

    # 生成 WinSCP 脚本
    $scriptContent = @"
open sftp://$($servers.UserName):$($servers.Password)@$($servers.Host):$($servers.Port)/
cd $remoteBase
mkdir web 2>nul
mkdir server 2>nul
cd web
put -delete e:\kf\web\dist\* /
cd ..
cd server
put -delete e:\kf\server\* /
bye
"@

    $scriptContent | Out-File -FilePath "e:\kf\upload_script.txt" -Encoding UTF8

    & $winscpPath /script="e:\kf\upload_script.txt"

    Write-Host "上传完成!" -ForegroundColor Green
} else {
    Write-Host "WinSCP 未安装，请手动上传以下目录:" -ForegroundColor Yellow
    Write-Host "  本地: e:\kf\web\dist\* -> 服务器: $remoteBase/web/" -ForegroundColor White
    Write-Host "  本地: e:\kf\server\* -> 服务器: $remoteBase/server/" -ForegroundColor White
    Write-Host ""
    Write-Host "使用以下命令连接服务器:" -ForegroundColor Cyan
    Write-Host "  sftp -P $($servers.Port) $($servers.UserName)@$($servers.Host)" -ForegroundColor White
}
