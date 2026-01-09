# 整合修復方案 - 終結重複問題

**創建日期**: 2026-01-02 05:42 AM  
**狀態**: 🔴 關鍵 - 必須遵守

---

## 🚨 問題根源

### 為什麼問題會重複發生？

**核心問題**: 使用舊的 Docker 鏡像 `taskflow-pro:v2.0.5-avatar-fix` 重啟容器

```
舊鏡像包含錯誤代碼 → 重啟容器 → 錯誤代碼復活 → 所有修復失效
```

### 受影響的功能

1. ✅ **登入系統** - `req.app.getDatabase()` 錯誤
2. ✅ **打卡功能** - 認證中間件錯誤
3. ✅ **聊天室** - chat.js 文件損壞或錯誤
4. ✅ **通訊錄** - 認證失敗導致無法載入
5. ✅ **所有需要認證的 API** - 中間件錯誤

---

## 🎯 終極解決方案

### 方案 A：一鍵修復腳本（臨時但有效）

已創建 `fix-all-issues.sh`，每次容器重啟後執行：

```bash
# 上傳並執行修復腳本
cat fix-all-issues.sh | ssh root@165.227.147.40 "cat > /tmp/fix.sh && chmod +x /tmp/fix.sh && docker cp /tmp/fix.sh taskflow-pro:/tmp/ && docker exec taskflow-pro /tmp/fix.sh"

# 重啟容器
ssh root@165.227.147.40 "docker restart taskflow-pro"
```

### 方案 B：創建新的 Docker 鏡像（永久解決）

```bash
# 1. 進入容器
ssh root@165.227.147.40 "docker exec -it taskflow-pro bash"

# 2. 執行修復腳本
/tmp/fix-all-issues.sh

# 3. 退出容器
exit

# 4. 提交新鏡像
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v2.0.6-all-fixed"

# 5. 使用新鏡像啟動
ssh root@165.227.147.40 "docker stop taskflow-pro && docker rm taskflow-pro && docker run -d --name taskflow-pro -p 3000:3000 -e PORT=3000 -v /app/data:/app/data taskflow-pro:v2.0.6-all-fixed"
```

---

## 📋 完整修復清單

### 1. 認證路由 (auth.js)
```bash
sed -i 's/req\.app\.getDatabase()/req.db/g' /app/dist/routes/auth.js
```

### 2. 認證中間件 (auth middleware)
```bash
sed -i 's/req\.app\.getDatabase()/req.db/g' /app/dist/middleware/auth.js
```

### 3. 聊天路由 (chat.js)
```bash
# 檢查文件是否完整
wc -l /app/dist/routes/chat.js

# 如果少於 100 行，需要從源文件恢復
# 源文件位置: server/src/routes/chat.js
```

### 4. 打卡路由 (attendance.js)
```bash
# 確保使用 V37 版本
grep "Attendance V37" /app/dist/routes/attendance.js

# 如果不是 V37，需要恢復
# 源文件位置: attendance-v37.js
```

---

## 🔄 標準操作流程

### 每次重啟容器後必須執行

```powershell
# PowerShell 一鍵修復
ssh root@165.227.147.40 "docker exec taskflow-pro sh -c 'sed -i \"s/req\.app\.getDatabase()/req.db/g\" /app/dist/routes/auth.js /app/dist/middleware/auth.js' && docker restart taskflow-pro"
```

### 或使用修復腳本

```powershell
# 上傳並執行
Get-Content "fix-all-issues.sh" -Raw | ssh root@165.227.147.40 "cat > /tmp/fix.sh && chmod +x /tmp/fix.sh && docker cp /tmp/fix.sh taskflow-pro:/tmp/ && docker exec taskflow-pro /tmp/fix.sh && docker restart taskflow-pro"
```

---

## 🛡️ 預防措施

### 1. 創建自動修復腳本

將修復腳本加入容器啟動命令：

```bash
docker run -d --name taskflow-pro \
  -p 3000:3000 \
  -e PORT=3000 \
  -v /app/data:/app/data \
  --restart unless-stopped \
  taskflow-pro:v2.0.5-avatar-fix \
  sh -c "sed -i 's/req\.app\.getDatabase()/req.db/g' /app/dist/routes/auth.js /app/dist/middleware/auth.js && npm start"
```

### 2. 創建健康檢查腳本

```powershell
# check-health.ps1
$health = Invoke-RestMethod -Uri "http://165.227.147.40:3000/api/health"
if ($health.status -eq "ok") {
    Write-Host "✓ 伺服器健康" -ForegroundColor Green
    
    # 測試登入
    try {
        $login = Invoke-RestMethod -Uri "http://165.227.147.40:3000/api/auth/login" `
            -Method POST `
            -Headers @{"Content-Type"="application/json"} `
            -Body '{"username":"admin-1766955365557","password":"123456"}'
        Write-Host "✓ 登入功能正常" -ForegroundColor Green
    } catch {
        Write-Host "✗ 登入功能異常" -ForegroundColor Red
        Write-Host "執行修復..." -ForegroundColor Yellow
        # 執行修復
        ssh root@165.227.147.40 "docker exec taskflow-pro sh -c 'sed -i \"s/req\.app\.getDatabase()/req.db/g\" /app/dist/routes/auth.js /app/dist/middleware/auth.js' && docker restart taskflow-pro"
    }
} else {
    Write-Host "✗ 伺服器異常" -ForegroundColor Red
}
```

### 3. 定期備份正確的文件

```bash
# 備份正確的文件
ssh root@165.227.147.40 "docker exec taskflow-pro tar -czf /tmp/correct-files.tar.gz /app/dist/routes/auth.js /app/dist/middleware/auth.js /app/dist/routes/chat.js /app/dist/routes/attendance.js"

# 下載備份
scp root@165.227.147.40:/tmp/correct-files.tar.gz ./backups/
```

---

## 📊 驗證所有功能

### 測試清單

```bash
# 1. 健康檢查
curl http://165.227.147.40:3000/api/health

# 2. 登入測試
curl -X POST http://165.227.147.40:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin-1766955365557","password":"123456"}'

# 3. 獲取 Token
TOKEN=$(curl -s -X POST http://165.227.147.40:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin-1766955365557","password":"123456"}' | jq -r '.token')

# 4. 測試聊天 API
curl -H "Authorization: Bearer $TOKEN" \
  http://165.227.147.40:3000/api/chat/channels

# 5. 測試打卡 API
curl -H "Authorization: Bearer $TOKEN" \
  http://165.227.147.40:3000/api/attendance/status

# 6. 測試用戶 API
curl -H "Authorization: Bearer $TOKEN" \
  http://165.227.147.40:3000/api/users
```

---

## 🎓 為什麼這個方案能解決問題？

### 問題分析

1. **舊鏡像問題**: `v2.0.5-avatar-fix` 包含錯誤代碼
2. **修復失效**: 每次重啟容器，修復都會消失
3. **連鎖反應**: 一個錯誤導致多個功能失效

### 解決方案

1. **自動修復**: 容器啟動時自動執行修復
2. **新鏡像**: 創建包含所有修復的新鏡像
3. **健康檢查**: 定期檢查並自動修復

---

## 🚀 立即執行

### 選項 1：快速修復（5分鐘）

```powershell
# 執行修復並重啟
ssh root@165.227.147.40 "docker exec taskflow-pro sh -c 'sed -i \"s/req\.app\.getDatabase()/req.db/g\" /app/dist/routes/auth.js /app/dist/middleware/auth.js' && docker restart taskflow-pro"
```

### 選項 2：永久解決（15分鐘）

```bash
# 1. 執行修復
ssh root@165.227.147.40 "docker exec taskflow-pro /tmp/fix-all-issues.sh"

# 2. 創建新鏡像
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v2.0.6-all-fixed"

# 3. 使用新鏡像
ssh root@165.227.147.40 "docker stop taskflow-pro && docker rm taskflow-pro && docker run -d --name taskflow-pro -p 3000:3000 -e PORT=3000 -v /app/data:/app/data taskflow-pro:v2.0.6-all-fixed"
```

---

## 📝 記錄與追蹤

### 修復歷史

| 日期 | 問題 | 修復方法 | 狀態 |
|------|------|----------|------|
| 2026-01-02 | 登入失敗 | 修復 auth.js | ✅ |
| 2026-01-02 | 打卡失敗 | 修復 auth middleware | ✅ |
| 2026-01-02 | 聊天室空白 | 恢復 chat.js | ✅ |
| 2026-01-02 | 重新整理登出 | 修改前端邏輯 | ✅ |

### 下次修復時

1. 查看此文檔
2. 執行整合修復腳本
3. 驗證所有功能
4. 更新記錄

---

**最後更新**: 2026-01-02 05:42 AM  
**版本**: 1.0  
**狀態**: 已測試並驗證
