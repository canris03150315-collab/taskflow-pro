# 登入問題永久修復指南

**創建日期**: 2026-01-02  
**最後更新**: 2026-01-02  
**狀態**: 🔴 重要 - 必讀

---

## 🚨 問題描述

**症狀**: 使用正確的帳號密碼無法登入，返回"伺服器內部錯誤"或"用戶名或密碼錯誤"

**根本原因**: 後端路由文件使用了錯誤的資料庫訪問方法

---

## 🔍 問題根源

### 錯誤代碼
```javascript
const db = req.app.getDatabase();  // ❌ 錯誤
```

### 正確代碼
```javascript
const db = req.db;  // ✅ 正確
```

---

## 📋 受影響的文件

1. **`/app/dist/routes/auth.js`** - 認證路由（登入、設置）
2. **`/app/dist/middleware/auth.js`** - 認證中間件
3. **`/app/dist/routes/chat.js`** - 聊天路由（如果有）
4. **其他使用認證的路由**

---

## 🔧 修復步驟

### 方法 1：使用 sed 命令（推薦）

```bash
# 修復 auth.js
ssh root@165.227.147.40 "docker exec taskflow-pro sed -i 's/req\.app\.getDatabase()/req.db/g' /app/dist/routes/auth.js"

# 修復 auth middleware
ssh root@165.227.147.40 "docker exec taskflow-pro sed -i 's/req\.app\.getDatabase()/req.db/g' /app/dist/middleware/auth.js"

# 重啟容器
ssh root@165.227.147.40 "docker restart taskflow-pro"
```

### 方法 2：恢復乾淨的容器

```bash
ssh root@165.227.147.40 "docker stop taskflow-pro && docker rm taskflow-pro && docker run -d --name taskflow-pro -p 3000:3000 -e PORT=3000 -v /app/data:/app/data taskflow-pro:v2.0.5-avatar-fix"
```

---

## 🎯 預防措施

### 1. 部署前檢查清單

在部署任何後端文件前，**必須**檢查：

```bash
# 檢查是否有錯誤的資料庫訪問
grep -n "req\.app\.getDatabase" /path/to/file.js

# 如果有結果，必須修復
sed -i 's/req\.app\.getDatabase()/req.db/g' /path/to/file.js
```

### 2. 標準部署流程

```bash
# 1. 備份
Backup-TaskFlowDB

# 2. 檢查文件
grep "req\.app\.getDatabase" your-file.js

# 3. 如果有問題，修復
sed -i 's/req\.app\.getDatabase()/req.db/g' your-file.js

# 4. 部署
# ... 你的部署命令

# 5. 重啟
docker restart taskflow-pro

# 6. 測試登入
curl -X POST http://165.227.147.40:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"YOUR_USERNAME","password":"YOUR_PASSWORD"}'
```

### 3. 創建自動檢查腳本

```powershell
# check-db-access.ps1
$files = @(
    "/app/dist/routes/auth.js",
    "/app/dist/middleware/auth.js",
    "/app/dist/routes/chat.js"
)

foreach ($file in $files) {
    $result = ssh root@165.227.147.40 "docker exec taskflow-pro grep -c 'req\.app\.getDatabase' $file 2>/dev/null || echo 0"
    if ([int]$result -gt 0) {
        Write-Host "❌ 發現問題: $file 包含 $result 個錯誤的資料庫訪問" -ForegroundColor Red
        Write-Host "   執行修復: sed -i 's/req\.app\.getDatabase()/req.db/g' $file" -ForegroundColor Yellow
    } else {
        Write-Host "✅ $file 正常" -ForegroundColor Green
    }
}
```

---

## 📊 測試帳號資訊

### 預設測試帳號

| 用戶名 | 密碼 | 角色 | 說明 |
|--------|------|------|------|
| `admin-1766955365557` | `123456` | BOSS | Seven (老闆) |
| `user-1767024824151-vbceaduza` | `123456` | SUPERVISOR | 測試主管 |

**注意**: 實際帳號請查詢資料庫確認

---

## 🔄 問題發生時的診斷流程

### 1. 檢查伺服器日誌

```bash
ssh root@165.227.147.40 "docker logs taskflow-pro --tail 50 | grep -i error"
```

### 2. 查看具體錯誤

```bash
ssh root@165.227.147.40 "docker logs taskflow-pro 2>&1 | grep -A 5 'auth.js'"
```

### 3. 測試登入 API

```bash
curl -X POST http://165.227.147.40:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin-1766955365557","password":"123456"}' \
  -v
```

### 4. 檢查資料庫

```bash
ssh root@165.227.147.40 "docker exec taskflow-pro node -e \"const db = require('better-sqlite3')('/app/data/taskflow.db'); const users = db.prepare('SELECT id, username, name, role FROM users').all(); console.log(JSON.stringify(users, null, 2)); db.close();\""
```

---

## 🎓 為什麼會重複發生？

### 原因分析

1. **容器恢復**: 使用舊的 Docker 鏡像恢復容器時，會帶回舊的錯誤代碼
2. **文件覆蓋**: 部署新文件時，如果源文件有問題，會覆蓋正確的文件
3. **TypeScript 編譯**: 如果 TypeScript 源文件有問題，編譯後的 JavaScript 也會有問題

### 解決方案

1. **修復源文件**: 確保 `server/src/routes/auth.ts` 使用 `req.db`
2. **更新 Docker 鏡像**: 創建包含修復的新鏡像
3. **使用檢查腳本**: 每次部署前自動檢查

---

## 📝 快速修復命令（複製貼上）

```bash
# 一鍵修復所有文件
ssh root@165.227.147.40 "docker exec taskflow-pro sh -c 'sed -i \"s/req\.app\.getDatabase()/req.db/g\" /app/dist/routes/auth.js /app/dist/middleware/auth.js' && docker restart taskflow-pro"

# 等待 15 秒後測試
sleep 15 && curl -X POST http://165.227.147.40:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin-1766955365557","password":"123456"}'
```

---

## ✅ 驗證修復成功

### 成功的標誌

1. **API 返回**: `{"user":{...},"token":"..."}`
2. **日誌無錯誤**: 沒有 "req.app.getDatabase is not a function"
3. **前端可登入**: 輸入帳密後成功進入系統

### 失敗的標誌

1. **API 返回**: `{"error":"伺服器內部錯誤"}`
2. **日誌有錯誤**: "TypeError: req.app.getDatabase is not a function"
3. **前端無法登入**: 顯示錯誤訊息

---

## 🔐 安全提醒

1. **測試完成後修改密碼**: 預設密碼 `123456` 僅供測試
2. **定期備份**: 使用 `Backup-TaskFlowDB`
3. **監控日誌**: 定期檢查錯誤日誌

---

## 📞 緊急聯絡

如果問題仍然存在：

1. 查看此文檔的診斷流程
2. 檢查 `PROJECT-KNOWLEDGE-BASE.md`
3. 查看工作日誌 `WORK-LOG-*.md`

---

**最後更新**: 2026-01-02 05:40 AM  
**版本**: 1.0  
**作者**: AI Assistant
