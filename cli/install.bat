@echo off
echo ====================================
echo 同花顺下单 CLI 工具 - 快速安装
echo ====================================
echo.

REM 检查 Node.js 是否安装
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] 检测到 Node.js
node --version

echo.
echo [2/3] 安装依赖包...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)

echo.
echo [3/3] 编译 TypeScript...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo [错误] 编译失败
    pause
    exit /b 1
)

echo.
echo ====================================
echo 安装完成！
echo ====================================
echo.
echo 使用方法:
echo   测试连接:    node dist\cli.js test
echo   查询资金:    node dist\cli.js query money
echo   查询持仓:    node dist\cli.js query position
echo   买入股票:    node dist\cli.js trade buy 600000 100
echo   卖出股票:    node dist\cli.js trade sell 600000 100
echo   查看帮助:    node dist\cli.js --help
echo.
echo 详细文档请查看 README.md
echo.
pause
