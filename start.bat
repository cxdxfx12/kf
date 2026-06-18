@echo off
chcp 65001 >nul
echo ========================================
echo    快递网点客服系统 - 一键启动
echo ========================================
echo.

REM 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 18+
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查 node_modules
if not exist "node_modules" (
    echo [1/3] 首次运行，正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo [错误] 依赖安装失败，请检查网络连接
        pause
        exit /b 1
    )
) else (
    echo [1/3] 依赖已安装
)

REM 检查数据库
if not exist "data" mkdir data
if not exist "data\cs.db" (
    echo [2/3] 正在初始化测试数据...
    call npx ts-node server/seed.ts
) else (
    echo [2/3] 数据库已存在，如需重置请删除 data/cs.db 文件
)

echo.
echo [3/3] 启动服务...
echo.
echo ========================================
echo   服务启动后，浏览器访问:
echo   http://localhost:3000
echo ========================================
echo.

start "" http://localhost:3000
call npx ts-node server/index.ts

pause
