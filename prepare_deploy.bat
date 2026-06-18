@echo off
chcp 65001 >nul
echo ========================================
echo   喵喵至家客服系统 - 服务器部署脚本
echo ========================================
echo.

set SERVER=211.149.181.178
set PORT=22
set USER=root
set PASSWORD=cxdxfx12
set REMOTE_PATH=/www/wwwroot/kf

echo [1/4] 创建本地部署目录...
if not exist "deploy_temp\web" mkdir deploy_temp\web
if not exist "deploy_temp\server" mkdir deploy_temp\server

echo [2/4] 复制前端文件...
xcopy /E /I /Y "web\dist\*" "deploy_temp\web\"

echo [3/4] 复制后端文件...
xcopy /E /I /Y "server\*" "deploy_temp\server\" /exclude:exclude.txt

echo [4/4] 创建部署说明...
echo 部署路径: %REMOTE_PATH% > deploy_temp\README.txt
echo 前端目录: %REMOTE_PATH%/web >> deploy_temp\README.txt
echo 后端目录: %REMOTE_PATH%/server >> deploy_temp\README.txt
echo. >> deploy_temp\README.txt
echo 安装命令: >> deploy_temp\README.txt
echo cd %REMOTE_PATH%/server ^&^& npm install >> deploy_temp\README.txt
echo pm2 start index.js --name kf-server >> deploy_temp\README.txt

echo.
echo ========================================
echo   部署包已准备完成
echo ========================================
echo.
echo 请使用以下命令上传到服务器:
echo sftp -P %PORT% %USER%@%SERVER%
echo.
echo 或使用 WinSCP 等工具上传 deploy_temp 目录到 %REMOTE_PATH%
echo.
pause
