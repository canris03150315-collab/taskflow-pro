# 部署擴充版平台營收系統
# 新增所有 Excel 欄位支援

Write-Host "=== 部署擴充版平台營收系統 ===" -ForegroundColor Cyan
Write-Host ""

# 步驟 1: 創建快照
Write-Host "[1/7] 創建部署前快照..." -ForegroundColor Yellow
ssh root@165.227.147.40 "/root/create-snapshot.sh v8.9.140-before-platform-revenue-extended"
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 快照創建失敗" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 快照已創建" -ForegroundColor Green
Write-Host ""

# 步驟 2: 新增資料庫欄位
Write-Host "[2/7] 新增資料庫欄位..." -ForegroundColor Yellow
Get-Content "add-platform-revenue-columns.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/add-columns.js"
ssh root@165.227.147.40 "docker cp /tmp/add-columns.js taskflow-pro:/app/add-columns.js"
$output = ssh root@165.227.147.40 "docker exec -w /app taskflow-pro node add-columns.js"
Write-Host $output
if ($output -notmatch "SUCCESS") {
    Write-Host "✗ 資料庫欄位新增失敗" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 資料庫欄位已新增" -ForegroundColor Green
Write-Host ""

# 步驟 3: 測試資料庫結構
Write-Host "[3/7] 測試資料庫結構..." -ForegroundColor Yellow
Get-Content "test-extended-platform-revenue.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/test-db.js"
ssh root@165.227.147.40 "docker cp /tmp/test-db.js taskflow-pro:/app/test-db.js"
$testOutput = ssh root@165.227.147.40 "docker exec -w /app taskflow-pro node test-db.js"
Write-Host $testOutput
if ($testOutput -notmatch "All Tests Passed") {
    Write-Host "✗ 資料庫結構測試失敗" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 資料庫結構測試通過" -ForegroundColor Green
Write-Host ""

# 步驟 4: 更新後端路由
Write-Host "[4/7] 更新後端路由..." -ForegroundColor Yellow
Get-Content "platform-revenue-extended-fixed.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/platform-revenue.js"
ssh root@165.227.147.40 "docker cp /tmp/platform-revenue.js taskflow-pro:/app/dist/routes/platform-revenue.js"
Write-Host "✓ 路由檔案已上傳" -ForegroundColor Green
Write-Host ""

# 步驟 5: 重啟容器
Write-Host "[5/7] 重啟容器..." -ForegroundColor Yellow
ssh root@165.227.147.40 "docker restart taskflow-pro"
Write-Host "等待容器啟動..." -ForegroundColor Gray
Start-Sleep -Seconds 8

# 檢查容器狀態
$containerStatus = ssh root@165.227.147.40 "docker ps --filter name=taskflow-pro --format '{{.Status}}'"
if ($containerStatus -notmatch "Up") {
    Write-Host "✗ 容器啟動失敗" -ForegroundColor Red
    Write-Host "容器狀態: $containerStatus" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 容器已重啟並正常運行" -ForegroundColor Green
Write-Host ""

# 步驟 6: 創建新映像
Write-Host "[6/7] 創建新 Docker 映像..." -ForegroundColor Yellow
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v8.9.140-platform-revenue-extended"
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 映像創建失敗" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 新映像已創建: taskflow-pro:v8.9.140-platform-revenue-extended" -ForegroundColor Green
Write-Host ""

# 步驟 7: 創建最終快照
Write-Host "[7/7] 創建最終快照..." -ForegroundColor Yellow
ssh root@165.227.147.40 "/root/create-snapshot.sh v8.9.140-platform-revenue-extended-complete"
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 最終快照創建失敗" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 最終快照已創建" -ForegroundColor Green
Write-Host ""

Write-Host "=== 部署完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "後端已更新，支援以下新欄位：" -ForegroundColor Cyan
Write-Host "  • 反水 (rebate_amount)"
Write-Host "  • 真人數 (real_person_count)"
Write-Host "  • 棋牌 (chess_amount)"
Write-Host "  • 彩票私返 (lottery_private_return)"
Write-Host "  • 領取分紅 (claim_dividend)"
Write-Host "  • 下架分紅 1 (delisted_dividend_1)"
Write-Host "  • 下架分紅 2 (delisted_dividend_2)"
Write-Host ""
Write-Host "部署信息：" -ForegroundColor Cyan
Write-Host "  • 後端映像: taskflow-pro:v8.9.140-platform-revenue-extended"
Write-Host "  • 快照（修改前）: taskflow-snapshot-v8.9.140-before-platform-revenue-extended-*.tar.gz"
Write-Host "  • 快照（完成後）: taskflow-snapshot-v8.9.140-platform-revenue-extended-complete-*.tar.gz"
Write-Host ""
Write-Host "下一步：" -ForegroundColor Yellow
Write-Host "  1. 測試上傳您的 Excel 檔案（C:\Users\USER\Downloads\平台帳變(備).xlsx）"
Write-Host "  2. 確認所有 16 個欄位都能正確解析"
Write-Host "  3. 檢查統計數據是否包含新欄位"
Write-Host ""
