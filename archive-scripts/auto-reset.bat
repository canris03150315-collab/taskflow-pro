@echo off
chcp 65001 >nul
echo ========================================
echo TaskFlow Pro - 自動重置和修復
echo ========================================
echo.

echo 步驟 1：上傳修復腳本...
echo j7WW03n4emoh| plink -batch -pw j7WW03n4emoh root@165.227.147.40 "cat > /tmp/reset.sh" < reset-and-fix.sh
if errorlevel 1 (
    echo 使用 SCP 上傳...
    echo j7WW03n4emoh| pscp -batch -pw j7WW03n4emoh reset-and-fix.sh root@165.227.147.40:/tmp/reset.sh
)
echo ✅ 腳本已上傳
echo.

echo 步驟 2：執行修復腳本...
plink -batch -pw j7WW03n4emoh root@165.227.147.40 "chmod +x /tmp/reset.sh && /tmp/reset.sh"
echo.

echo 步驟 3：等待後端啟動...
timeout /t 5 /nobreak >nul
echo.

echo 步驟 4：測試 API...
curl -s https://transcendent-basbousa-6df2d2.netlify.app/api/auth/setup/check
echo.
echo.

echo ========================================
echo ✅ 完成！
echo ========================================
echo.
echo 現在請訪問前端並創建管理員帳號：
echo https://transcendent-basbousa-6df2d2.netlify.app
echo.
pause
