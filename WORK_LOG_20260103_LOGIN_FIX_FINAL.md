# 登入問題終極修復方案

**日期**：2026-01-03  
**版本**：v8.9.6-login-fixed-final  
**狀態**：✅ 已完全修復

---

## 📋 問題描述

### 症狀
- 前端登入返回 500 Internal Server Error
- 後端 API 直接測試正常，但通過 Netlify 反向代理失敗
- 多次回滾和修復嘗試都無效

### 影響範圍
- **嚴重性**: 🔴 P0（系統完全無法使用）
- **影響時間**: 約 2 小時
- **影響用戶**: 所有用戶

---

## 🔍 診斷過程

### 1. 初始診斷（錯誤方向）
- ❌ 嘗試修改 `.env.production` 直接連接後端
- ❌ 遇到 Mixed Content 錯誤（HTTPS 前端請求 HTTP 後端）
- ❌ 改為 HTTPS 連接後端，但瀏覽器無法驗證自簽名證書

### 2. 深度診斷（正確方向）
根據 PROJECT-KNOWLEDGE-BASE.md 和工作日誌，確認正確配置應為：
- 前端 `.env.production` 設置 `VITE_API_URL=/api`
- Netlify 通過 `netlify.toml` 反向代理到後端

### 3. 發現根本問題

**問題 1：CORS 配置只允許 localhost**
```javascript
// 原配置
origin: ['http://localhost:3000', 'https://localhost:3000', 'http://127.0.0.1:3000']
```

**問題 2：後端只監聽 HTTPS，不監聽 HTTP**
- 後端使用自簽名 HTTPS 證書
- Netlify 反向代理使用 HTTP 連接
- 導致 502 Bad Gateway 或 500 Internal Server Error

**問題 3：Docker 容器端口未映射**
- 添加 HTTP 伺服器後，端口 3001 未映射到容器外部

---

## ✅ 修復方案

### 步驟 1：修復 CORS 配置

**創建修復腳本** `fix-cors-config.js`：
```javascript
const fs = require('fs');
const filePath = '/app/dist/server.js';
let content = fs.readFileSync(filePath, 'utf8');

const oldCors = "origin: ['http://localhost:3000', 'https://localhost:3000', 'http://127.0.0.1:3000']";
const newCors = "origin: ['http://localhost:3000', 'https://localhost:3000', 'http://127.0.0.1:3000', 'https://transcendent-basbousa-6df2d2.netlify.app', 'http://165.227.147.40:3000', 'https://165.227.147.40:3000']";

content = content.replace(oldCors, newCors);
fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: CORS config updated');
```

**部署命令**：
```powershell
Get-Content "fix-cors-config.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/fix-cors-config.js"
ssh root@165.227.147.40 "docker cp /tmp/fix-cors-config.js taskflow-pro:/app/fix-cors-config.js && docker exec -w /app taskflow-pro node fix-cors-config.js"
```

### 步驟 2：添加 HTTP 伺服器

**創建修復腳本** `add-http-server.js`：
```javascript
const fs = require('fs');
const filePath = '/app/dist/server.js';
let content = fs.readFileSync(filePath, 'utf8');

const listenPattern = /this\.server\.listen\(this\.config\.port, '0\.0\.0\.0', \(\) => \{/;
const httpServerCode = `
            const http = require('http');
            const httpServer = http.createServer(this.app);
            httpServer.listen(3001, '0.0.0.0', () => {
                console.log('\\u2705 HTTP \\u4f3a\\u670d\\u5668\\u5df2\\u555f\\u52d5\\u65bc\\u7aef\\u53e3 3001');
            });
            this.server.listen(this.config.port, '0.0.0.0', () => {`;

content = content.replace(listenPattern, httpServerCode);
fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: HTTP server added on port 3001');
```

**部署命令**：
```powershell
Get-Content "add-http-server.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/add-http-server.js"
ssh root@165.227.147.40 "docker cp /tmp/add-http-server.js taskflow-pro:/app/add-http-server.js && docker exec -w /app taskflow-pro node add-http-server.js"
```

### 步驟 3：開放防火牆端口

```bash
ssh root@165.227.147.40 "ufw allow 3001/tcp"
```

### 步驟 4：重新創建容器（映射端口 3001）

```bash
ssh root@165.227.147.40 "docker stop taskflow-pro && docker rm taskflow-pro && docker run -d --name taskflow-pro -p 3000:3000 -p 3001:3001 -e PORT=3000 -v /root/taskflow-data:/app/data taskflow-pro:v8.9.5-http-server-added"
```

### 步驟 5：更新 Netlify 配置

修改 `netlify.toml`：
```toml
[[redirects]]
  from = "/api/*"
  to = "http://165.227.147.40:3001/api/:splat"
  status = 200
  force = true
```

### 步驟 6：重新部署前端

```powershell
Remove-Item -Recurse -Force dist
npm run build
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build
```

---

## 📊 最終架構

```
用戶瀏覽器 (HTTPS)
       ↓
Netlify CDN (HTTPS)
       ↓ 反向代理
後端伺服器 HTTP:3001 ← Netlify 連接
後端伺服器 HTTPS:3000 ← 直接訪問（需接受自簽名證書）
       ↓
SQLite 資料庫
```

**端口說明**：
- **3000 (HTTPS)**: 直接訪問用，使用自簽名證書
- **3001 (HTTP)**: Netlify 反向代理用

---

## 📦 最終版本

- **後端映像**: `taskflow-pro:v8.9.6-login-fixed-final`
- **前端 Deploy ID**: `69591504587043ef4bc04a14`
- **快照**: `taskflow-snapshot-v8.9.6-login-fixed-final-20260103_131530.tar.gz` (214MB)
- **狀態**: ✅ 已完全修復

---

## 🎓 關鍵教訓

### 1. 後端必須同時支持 HTTP 和 HTTPS
- HTTPS 用於直接訪問（瀏覽器）
- HTTP 用於反向代理（Netlify 無法驗證自簽名證書）

### 2. CORS 必須包含所有前端域名
- localhost（開發環境）
- Netlify 域名（生產環境）
- 後端 IP（直接訪問）

### 3. Docker 容器端口必須正確映射
- 添加新端口後，必須重新創建容器
- 使用 `-p 3001:3001` 映射新端口

### 4. 遵循 PROJECT-KNOWLEDGE-BASE.md 的配置
- 前端 `VITE_API_URL=/api`
- Netlify 反向代理到後端

### 5. 使用容器內 Node.js 腳本測試
- 避免 SSH 引號問題
- 例如：`docker exec -w /app taskflow-pro node test-login.js`

---

## 🔧 快速恢復命令

如果登入問題再次發生，執行以下命令：

```bash
# 1. 檢查後端是否正常
ssh root@165.227.147.40 "docker exec -w /app taskflow-pro node test-login.js"

# 2. 檢查端口映射
ssh root@165.227.147.40 "docker port taskflow-pro"

# 3. 如果端口 3001 未映射，重新創建容器
ssh root@165.227.147.40 "docker stop taskflow-pro && docker rm taskflow-pro && docker run -d --name taskflow-pro -p 3000:3000 -p 3001:3001 -e PORT=3000 -v /root/taskflow-data:/app/data taskflow-pro:v8.9.6-login-fixed-final"
```

---

**創建日期**: 2026-01-03  
**最後更新**: 2026-01-03  
**作者**: AI Assistant
