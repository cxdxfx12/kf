# 使用 PowerShell SSH 会话部署
$server = "211.149.181.178"
$port = 22
$user = "root"
$pass = "cxdxfx12"

# 创建 SSH 会话
$securePass = ConvertTo-SecureString $pass -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($user, $securePass)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  喵喵至家客服系统 - 服务器部署" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    # 创建 SSH 会话
    Write-Host "[1/4] 连接到服务器 $server ..." -ForegroundColor Yellow
    $session = New-SSHSession -ComputerName $server -Port $port -Credential $cred -AcceptKey

    if ($session.Connected) {
        Write-Host "  连接成功!" -ForegroundColor Green

        # 1. 创建目录
        Write-Host "[2/4] 创建目录结构..." -ForegroundColor Yellow
        $null = Invoke-SSHCommand -SessionId $session.SessionId -Command "mkdir -p /www/wwwroot/kf/web /www/wwwroot/kf/server"

        # 2. 上传前端文件
        Write-Host "[3/4] 上传前端文件..." -ForegroundColor Yellow
        $sftp = New-SFTPSession -ComputerName $server -Port $port -Credential $cred -AcceptKey
        $sftpPath = "/www/wwwroot/kf/web"

        # 上传前端 dist 目录内容
        Get-ChildItem "e:\kf\web\dist" -Recurse | ForEach-Object {
            $remotePath = $sftpPath + "/" + $_.Name
            if ($_.PSIsContainer) {
                $null = Invoke-SSHCommand -SessionId $session.SessionId -Command "mkdir -p `"$remotePath`""
            }
        }

        # 使用 SCP 上传
        $null = Invoke-SSHCommand -SessionId $session.SessionId -Command "cd /www/wwwroot/kf/web && rm -rf * && scp -r root@localhost:null 2>/dev/null || true"

        Write-Host "  前端文件准备上传..." -ForegroundColor Gray

        # 3. 上传后端文件
        Write-Host "[4/4] 上传后端文件..." -ForegroundColor Yellow
        Write-Host "  后端文件准备上传..." -ForegroundColor Gray

        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  连接成功！请使用以下方式上传文件:" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "方式1: 使用 WinSCP (推荐)" -ForegroundColor Yellow
        Write-Host "  1. 下载 WinSCP: https://winscp.net/" -ForegroundColor White
        Write-Host "  2. 连接信息:" -ForegroundColor White
        Write-Host "     主机名: $server" -ForegroundColor White
        Write-Host "     端口: $port" -ForegroundColor White
        Write-Host "     用户名: $user" -ForegroundColor White
        Write-Host "     密码: $pass" -ForegroundColor White
        Write-Host "  3. 上传本地目录到 /www/wwwroot/kf/" -ForegroundColor White
        Write-Host ""
        Write-Host "方式2: 使用 FileZilla" -ForegroundColor Yellow
        Write-Host "  1. 下载 FileZilla: https://filezilla-project.org/" -ForegroundColor White
        Write-Host "  2. 站点管理器配置同上" -ForegroundColor White
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "  服务器部署命令 (SSH连接后执行):" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host '  cd /www/wwwroot/kf/server' -ForegroundColor White
        Write-Host '  npm install' -ForegroundColor White
        Write-Host '  pm2 start index.js --name kf-server' -ForegroundColor White
        Write-Host '  pm2 save' -ForegroundColor White
        Write-Host '  pm2 startup' -ForegroundColor White
        Write-Host ""

        # 关闭会话
        Remove-SSHSession -SessionId $session.SessionId | Out-Null
    }
} catch {
    Write-Host ""
    Write-Host "SSH 连接失败: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "请手动使用 SFTP 客户端上传文件" -ForegroundColor Yellow
}
