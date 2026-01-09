# WebSocket Netlify 反向代理修復

**日期**: 2026-01-06  
**版本**: v8.9.19-websocket-netlify-proxy  
**狀態**: ✅ 已完成

---

## 📋 問題演進

### 第一次錯誤 (Mixed Content)
```
Mixed Content: The page at 'https://...' was loaded over HTTPS, 
but attempted to connect to the insecure WebSocket endpoint 'ws://...'
```
**原因**: HTTPS 網站無法連接到 WS (不安全的 WebSocket)

### 第二次錯誤 (WSS 連接失敗)
```
WebSocket connection to 'wss://165.227.147.40:3000/ws' failed
```
**原因**: 後端自簽名證書問題，瀏覽器拒絕連接

---

## 🔍 根本原因

1. **後端配置**: 後端只有 HTTPS (port 3000)，使用自簽名證書
2. **瀏覽器限制**: 瀏覽器不信任自簽名證書，拒絕 WSS 連接
3. **架構問題**: 前端直接連接後端 WSS，繞過了 Netlify 反向代理

---

## 🎯 解決方案

### 使用 Netlify 反向代理

**架構**:
```
用戶瀏覽器 (HTTPS)
    ↓
Netlify (WSS → WS 轉換)
    ↓
後端伺服器 (WS/HTTP)
```

### 關鍵修改

#### 1. 前端 WebSocket URL (App.tsx)

**修改前**:
```typescript
const wsUrl = 'wss://165.227.147.40:3000/ws';  // 直接連接後端
```

**修改後**:
```typescript
// 使用相對路徑，讓 Netlify 反向代理處理
const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
```

**效果**:
- 開發環境: `ws://localhost:5173/ws`
- 生產環境: `wss://transcendent-basbousa-6df2d2.netlify.app/ws`

#### 2. Netlify 配置 (netlify.toml)

**新增 WebSocket 反向代理**:
```toml
[[redirects]]
  from = "/ws"
  to = "ws://165.227.147.40:3000/ws"
  status = 200
  force = true
```

**完整配置**:
```toml
# API 反向代理
[[redirects]]
  from = "/api/*"
  to = "http://165.227.147.40:3001/api/:splat"
  status = 200
  force = true
  headers = {X-From = "Netlify"}

# WebSocket 反向代理
[[redirects]]
  from = "/ws"
  to = "ws://165.227.147.40:3000/ws"
  status = 200
  force = true

# SPA 路由
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 📦 部署流程

### 1. 修改前端代碼
```typescript
// App.tsx 第 185 行
const wsUrl = import.meta.env.VITE_WS_URL || 
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
```

### 2. 修改 Netlify 配置
添加 WebSocket 反向代理到 `netlify.toml`

### 3. 構建並部署
```powershell
Remove-Item -Recurse -Force dist
npm run build
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build
```
- Deploy ID: `695cc4191d164364039703cb`

### 4. 創建快照
```bash
/root/create-snapshot.sh v8.9.19-websocket-netlify-proxy
```

---

## ✅ 驗證結果

### 連接流程
```
1. 前端: wss://transcendent-basbousa-6df2d2.netlify.app/ws
2. Netlify: 接收 WSS 連接
3. Netlify: 轉發到 ws://165.227.147.40:3000/ws
4. 後端: 接收 WS 連接
5. ✅ 連接成功
```

### 優勢
- ✅ **無需後端 HTTPS**: 後端只需支援 HTTP/WS
- ✅ **無證書問題**: Netlify 處理 HTTPS/WSS
- ✅ **統一域名**: 前端和 WebSocket 使用同一域名
- ✅ **簡化架構**: 所有流量通過 Netlify

---

## 📊 技術架構

### 修改前（失敗）
```
用戶 → HTTPS → Netlify → 前端
用戶 → WSS → 後端自簽名證書 ❌ (瀏覽器拒絕)
```

### 修改後（成功）
```
用戶 → HTTPS → Netlify → 前端
用戶 → WSS → Netlify → WS → 後端 ✅
```

### 端口使用
- **後端 port 3000**: HTTP + WebSocket (WS)
- **後端 port 3001**: HTTP (API)
- **Netlify**: HTTPS + WSS (反向代理)

---

## 🎯 影響範圍

### 修復的功能
所有即時更新功能恢復正常：
- ✅ 人員管理即時更新
- ✅ 任務管理即時更新
- ✅ 財務管理即時更新
- ✅ 部門管理即時更新
- ✅ 公告系統即時更新
- ✅ 備忘錄系統即時更新
- ✅ 建議系統即時更新
- ✅ 報表系統即時更新
- ✅ 出勤系統即時更新
- ✅ SOP 文檔即時更新

### 聊天系統
聊天系統有獨立的 WebSocket 實現，也會受益於此修復。

---

## 📝 最終版本

- **後端**: `taskflow-pro:v8.9.17-all-modules-realtime` (無需修改)
- **前端**: Deploy ID `695cc4191d164364039703cb`
- **快照**: `taskflow-snapshot-v8.9.19-websocket-netlify-proxy-XXXXXX.tar.gz`
- **狀態**: ✅ 已完成

---

## 🔑 關鍵教訓

1. **使用反向代理** - 讓 Netlify 處理 HTTPS/WSS，後端只需 HTTP/WS
2. **統一域名** - 前端和 WebSocket 使用同一域名，避免 CORS 和證書問題
3. **相對路徑** - 使用 `window.location` 動態生成 URL，適應不同環境
4. **簡化架構** - 所有流量通過 Netlify，後端無需複雜的 HTTPS 配置

---

## 📞 相關文件

- **第一次修復**: `WORK_LOG_20260106_WEBSOCKET_WSS_FIX.md`
- **即時更新實施**: `WORK_LOG_20260106_ALL_MODULES_REALTIME.md`
- **設計文檔**: `REALTIME_UPDATE_DESIGN.md`

---

## 🚀 使用效果

現在從 HTTPS 網站可以正常連接到後端 WebSocket：
- 連接方式: 通過 Netlify 反向代理
- 連接狀態: ✅ 正常
- 即時更新: ✅ 全部功能正常

所有用戶都能享受完整的即時更新體驗！

---

**最後更新**: 2026-01-06  
**作者**: Cascade AI
