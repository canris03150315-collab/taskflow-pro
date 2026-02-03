# 平台營收詳細欄位擴展 - 部署腳本（修正版）
# 版本: v8.9.208-platform-revenue-detailed
# 日期: 2026-02-03

Write-Host "=== 平台營收詳細欄位擴展部署 ===" -ForegroundColor Cyan
Write-Host ""

# 配置
$SERVER = "root@165.227.147.40"
$VERSION = "v8.9.208-platform-revenue-detailed"
$CONTAINER_NAME = "taskflow-pro"

# 步驟 1: 創建快照備份
Write-Host "步驟 1/8: 創建快照備份..." -ForegroundColor Yellow
ssh ${SERVER} "/root/create-snapshot.sh ${VERSION}-before-deployment"
Write-Host "✓ 快照已創建" -ForegroundColor Green

# 步驟 2: 上傳數據庫遷移腳本
Write-Host "步驟 2/8: 上傳數據庫遷移腳本..." -ForegroundColor Yellow
scp "migrate-platform-revenue-detailed.cjs" "${SERVER}:/tmp/migrate-platform-revenue-detailed.cjs"
Write-Host "✓ 遷移腳本已上傳" -ForegroundColor Green

# 步驟 3: 上傳新的解析器
Write-Host "步驟 3/8: 上傳新的解析器..." -ForegroundColor Yellow
scp "platform-revenue-detailed.js" "${SERVER}:/tmp/platform-revenue-detailed.js"
Write-Host "✓ 解析器已上傳" -ForegroundColor Green

# 步驟 4: 執行數據庫遷移
Write-Host "步驟 4/8: 執行數據庫遷移..." -ForegroundColor Yellow
ssh ${SERVER} "docker cp /tmp/migrate-platform-revenue-detailed.cjs ${CONTAINER_NAME}:/app/migrate-platform-revenue-detailed.cjs"
ssh ${SERVER} "docker exec -w /app ${CONTAINER_NAME} node migrate-platform-revenue-detailed.cjs"
Write-Host "✓ 數據庫遷移完成" -ForegroundColor Green

# 步驟 5: 替換路由文件
Write-Host "步驟 5/8: 替換路由文件..." -ForegroundColor Yellow
ssh ${SERVER} "docker cp /tmp/platform-revenue-detailed.js ${CONTAINER_NAME}:/app/dist/routes/platform-revenue.js"
Write-Host "✓ 路由文件已替換" -ForegroundColor Green

# 步驟 6: 重啟容器
Write-Host "步驟 6/8: 重啟容器..." -ForegroundColor Yellow
ssh ${SERVER} "docker restart ${CONTAINER_NAME}"
Write-Host "✓ 容器已重啟" -ForegroundColor Green

# 步驟 7: Commit 新映像
Write-Host "步驟 7/8: Commit 新映像..." -ForegroundColor Yellow
ssh ${SERVER} "docker commit ${CONTAINER_NAME} taskflow-pro:${VERSION}"
Write-Host "✓ 新映像已創建: taskflow-pro:${VERSION}" -ForegroundColor Green

# 步驟 8: 創建最終快照
Write-Host "步驟 8/8: 創建最終快照..." -ForegroundColor Yellow
ssh ${SERVER} "/root/create-snapshot.sh ${VERSION}-complete"
Write-Host "✓ 最終快照已創建" -ForegroundColor Green

Write-Host ""
Write-Host "=== 部署完成 ===" -ForegroundColor Green
Write-Host "版本: ${VERSION}" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "1. 測試平台營收功能"
Write-Host "2. 確認詳細欄位正確顯示"
Write-Host "3. Git commit 所有變更"
Write-Host "4. 更新 WORK_LOG_CURRENT.md"
