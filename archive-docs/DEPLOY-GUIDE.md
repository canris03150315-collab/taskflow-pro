# TaskFlow Pro 雲端部署指南

## 🎯 快速部署到 Railway（推薦）

### 為什麼選擇 Railway？
- ✅ **免費額度充足** - 每月 $5 免費額度
- ✅ **自動構建** - 檢測 Node.js 項目自動配置
- ✅ **支持 SQLite** - better-sqlite3 完美支持
- ✅ **一鍵部署** - 連接 GitHub 即可

---

## 📋 部署步驟（10 分鐘完成）

### 步驟 1：推送代碼到 GitHub（已完成 ✅）
您的代碼已經在：https://github.com/canris03150315-collab/taskflow-pro-server

### 步驟 2：註冊 Railway
1. 訪問：https://railway.app
2. 點擊 "Start a New Project"
3. 使用 GitHub 登入

### 步驟 3：連接倉庫
1. 選擇 "Deploy from GitHub repo"
2. 選擇 `taskflow-pro-server` 倉庫
3. Railway 會自動檢測到 Node.js 項目

### 步驟 4：配置環境變數
在 Railway 項目設置中添加：
```
PORT=3000
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this
```

### 步驟 5：部署
1. 點擊 "Deploy"
2. 等待 5-10 分鐘
3. 查看部署日誌

### 步驟 6：獲取 URL
部署成功後，Railway 會提供一個公開 URL，例如：
```
https://taskflow-pro-server-production.up.railway.app
```

---

## 🔧 如果部署失敗

### 查看日誌
1. 點擊 Railway 項目
2. 查看 "Deployments" 標籤
3. 點擊最新的部署
4. 查看 "Build Logs" 和 "Deploy Logs"

### 常見問題

#### 1. TypeScript 編譯錯誤
**解決方案**：在 tsconfig.json 中設置 `"noEmitOnError": false`

#### 2. better-sqlite3 編譯失敗
**解決方案**：Railway 會自動安裝編譯工具，通常不會失敗

#### 3. 缺少依賴
**解決方案**：檢查 package.json 確保所有依賴都已列出

---

## 🚀 替代方案：Render

如果 Railway 不適合，可以使用 Render：

### 部署到 Render
1. 訪問：https://render.com
2. 連接 GitHub 倉庫
3. 選擇 "Web Service"
4. 配置：
   - Build Command: `cd server && npm install && npm run build`
   - Start Command: `cd server && npm start`
5. 添加環境變數（同上）
6. 點擊 "Create Web Service"

---

## 📊 部署後驗證

### 測試 API
```bash
# 健康檢查
curl https://your-app.railway.app/health

# 測試登入
curl -X POST https://your-app.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 查看日誌
在 Railway/Render 控制台查看實時日誌，確認：
- ✅ 服務器啟動成功
- ✅ 資料庫初始化完成
- ✅ 沒有運行時錯誤

---

## 🎯 下一步

部署成功後：
1. 測試所有 API 端點
2. 連接前端應用
3. 配置自定義域名（可選）
4. 設置監控和告警

---

## ❓ 需要幫助？

如果遇到問題：
1. 複製完整的部署日誌
2. 告訴我具體的錯誤訊息
3. 我會幫您快速修復

---

**現在就開始部署吧！** 🚀
