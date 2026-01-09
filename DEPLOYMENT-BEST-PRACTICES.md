# 部署最佳實踐指南

**創建日期**: 2026-01-02 06:26 AM  
**目的**: 避免白忙活，確保每次部署都包含所有修復

---

## 🎯 核心原則

1. **前端和後端分開處理**
2. **每次修改後必須重新構建**
3. **部署前必須清除舊的構建**
4. **創建新的 Docker 鏡像保存修復**

---

## 📦 前端部署流程

### 步驟 1: 清除舊構建
```powershell
cd "C:\Users\USER\Downloads\公司內部"
Remove-Item -Recurse -Force dist
```

### 步驟 2: 安裝依賴（如果需要）
```powershell
npm install
```

### 步驟 3: 構建
```powershell
npm run build
```

**注意**: 如果出現 terser 錯誤：
```powershell
npm install -D terser
npm run build
```

### 步驟 4: 部署到 Netlify
```powershell
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build
```

### 步驟 5: 驗證部署
```powershell
# 記錄部署 ID（從輸出中複製）
# 例如: 6956f3feaaec2aad0650c882
```

---

## 🐳 後端部署流程

### 步驟 1: 備份資料庫
```bash
ssh root@165.227.147.40 "docker exec taskflow-pro node dist/index.js backup"
```

### 步驟 2: 修復後端文件
```bash
# 修復 auth.js 和 middleware
ssh root@165.227.147.40 "docker exec taskflow-pro sed -i 's/req.app.getDatabase()/req.db/g' /app/dist/routes/auth.js /app/dist/middleware/auth.js"

# 恢復 chat.js（如果需要）
Get-Content "server/src/routes/chat.js" -Raw | ssh root@165.227.147.40 "docker exec -i taskflow-pro sh -c 'cat > /app/dist/routes/chat.js'"

# 恢復 attendance.js V37（如果需要）
Get-Content "attendance-v37.js" -Raw | ssh root@165.227.147.40 "docker exec -i taskflow-pro sh -c 'cat > /app/dist/routes/attendance.js'"

# 修復 users.js - 移除 SUPERVISOR 限制
ssh root@165.227.147.40 "docker exec taskflow-pro sed -i '27,31d' /app/dist/routes/users.js"
```

### 步驟 3: 重啟容器
```bash
ssh root@165.227.147.40 "docker restart taskflow-pro"
```

### 步驟 4: 創建新的 Docker 鏡像
```bash
# 等待容器啟動（15秒）
Start-Sleep -Seconds 15

# 創建新鏡像（使用遞增版本號）
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v2.1.X-description"

# 例如:
# v2.1.0-final - 初始完整修復
# v2.1.1-chat-order-fix - 聊天順序修復
# v2.1.2-refresh-fix - 重新整理修復
```

### 步驟 5: 使用新鏡像重啟
```bash
ssh root@165.227.147.40 "docker stop taskflow-pro && docker rm taskflow-pro && docker run -d --name taskflow-pro -p 3000:3000 -e PORT=3000 -v /app/data:/app/data taskflow-pro:v2.1.X-description"
```

### 步驟 6: 驗證
```bash
# 等待啟動
Start-Sleep -Seconds 15

# 健康檢查
ssh root@165.227.147.40 "curl -s http://localhost:3000/api/health"

# 查看日誌
ssh root@165.227.147.40 "docker logs taskflow-pro --tail 20"
```

---

## ✅ 完整部署檢查清單

### 前端部署
- [ ] 清除舊的 dist 目錄
- [ ] 確認依賴已安裝
- [ ] 成功構建（無錯誤）
- [ ] 部署到 Netlify
- [ ] 記錄部署 ID
- [ ] 使用無痕模式測試
- [ ] 確認所有功能正常

### 後端部署
- [ ] 備份資料庫
- [ ] 應用所有必要修復
- [ ] 重啟容器
- [ ] 創建新 Docker 鏡像
- [ ] 使用新鏡像重啟
- [ ] 健康檢查通過
- [ ] 查看日誌無錯誤
- [ ] 測試所有 API

---

## 🚨 常見錯誤和解決方案

### 錯誤 1: terser not found
**解決方案**:
```powershell
npm install -D terser
```

### 錯誤 2: 前端緩存問題
**解決方案**:
- 使用無痕模式測試
- 或完全清除瀏覽器緩存（Ctrl+Shift+Delete）
- 選擇「全部時間」
- 關閉並重新開啟瀏覽器

### 錯誤 3: 修復後重啟又恢復錯誤
**原因**: 使用舊的 Docker 鏡像
**解決方案**: 創建新的 Docker 鏡像並使用它

### 錯誤 4: PowerShell 語法錯誤
**解決方案**:
- 不要使用 `&&`，用分號 `;` 分隔命令
- 使用 Here-String `@"..."@` 處理多行
- 避免複雜的引號嵌套

---

## 📝 版本記錄

| 版本 | 日期 | 說明 | 包含修復 |
|------|------|------|----------|
| v2.0.6-all-fixed | 2026-01-02 | 初始整合修復 | auth, middleware, chat, attendance |
| v2.1.0-stable | 2026-01-02 | 移除 SUPERVISOR 限制 | + users.js 修復 |
| v2.1.1-chat-order | 2026-01-02 | 聊天訊息順序修復 | + 前端訊息順序 |

---

## 🎯 測試清單

### 前端測試
- [ ] 登入功能
- [ ] 重新整理保持登入
- [ ] 聊天訊息順序正確
- [ ] 通訊錄顯示所有用戶
- [ ] 打卡功能
- [ ] 所有頁面正常載入

### 後端測試
- [ ] `/api/health` 返回 OK
- [ ] `/api/auth/login` 正常
- [ ] `/api/users` 返回所有用戶
- [ ] `/api/chat/channels` 正常
- [ ] `/api/attendance/status` 正常
- [ ] 日誌無錯誤

---

## 💡 最佳實踐

1. **每次修改前先備份**
2. **一次只修改一個功能**
3. **修改後立即測試**
4. **測試通過後才創建新鏡像**
5. **記錄每次修改的內容**
6. **使用版本號管理 Docker 鏡像**
7. **保留至少 2 個可用的鏡像版本**

---

## 🔗 相關文檔

- `INTEGRATED-FIX-SOLUTION.md` - 整合修復方案
- `LOGIN-ISSUE-PERMANENT-FIX.md` - 登入問題修復
- `CHAT-MESSAGE-SENDER-FIX.md` - 聊天發送者問題
- `PROJECT-KNOWLEDGE-BASE.md` - 項目知識庫

---

## 📞 快速命令參考

### 前端快速部署
```powershell
cd "C:\Users\USER\Downloads\公司內部"
Remove-Item -Recurse -Force dist
npm run build
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build
```

### 後端快速修復
```bash
ssh root@165.227.147.40 "docker exec taskflow-pro sed -i 's/req.app.getDatabase()/req.db/g' /app/dist/routes/auth.js /app/dist/middleware/auth.js && docker restart taskflow-pro"
```

### 健康檢查
```bash
ssh root@165.227.147.40 "curl -s http://localhost:3000/api/health"
```

---

**最後更新**: 2026-01-02 06:26 AM  
**維護者**: AI Assistant  
**狀態**: ✅ 已驗證有效
