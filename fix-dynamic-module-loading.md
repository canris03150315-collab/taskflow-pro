# 動態模組載入錯誤修復

**日期**: 2026-01-10  
**版本**: v8.9.100-module-loading-fix

## 問題描述

有時會出現以下錯誤：
```
Failed to load module script: Expected a JavaScript-or-Wasm module script 
but the server responded with a MIME type of "text/html". 
Strict MIME type checking is enforced for module scripts per HTML spec.

Uncaught TypeError: Failed to fetch dynamically imported module: 
https://transcendent-basbousa-6df2d2.netlify.app/assets/SubordinateView-868nSYa1.js
```

## 根本原因

**Netlify SPA 路由配置問題**：

`netlify.toml` 中的萬用路由規則：
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

這個規則會將**所有請求**（包括 `/assets/*.js`）都重定向到 `index.html`，導致：
1. 瀏覽器請求 `/assets/SubordinateView-868nSYa1.js`
2. Netlify 返回 `index.html`（MIME type: text/html）
3. 瀏覽器期望 JavaScript 但收到 HTML → 錯誤

## 解決方案

### 修改前的 netlify.toml
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**問題**：
- 所有路徑（包括 `/assets/*`）都被重定向到 `index.html`
- 靜態資源無法正確載入

### 修改後的 netlify.toml
```toml
# 靜態資源緩存設定
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# HTML 文件不緩存
[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"
    Pragma = "no-cache"
    Expires = "0"

# API 反向代理
[[redirects]]
  from = "/api/*"
  to = "http://165.227.147.40:3001/api/:splat"
  status = 200
  force = true

# WebSocket 代理
[[redirects]]
  from = "/ws"
  to = "ws://165.227.147.40:3000/ws"
  status = 200
  force = true

# SPA fallback - 只對非靜態資源路徑生效
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**改進**：
1. **移除 `/assets/*` 的 no-cache 設定**
   - 改為 `max-age=31536000, immutable`（永久緩存）
   - 因為 Vite 構建時會為文件添加 hash，文件名變更時自動失效

2. **只對 HTML 文件設定 no-cache**
   - 確保用戶總是獲取最新版本

3. **SPA fallback 自然排除靜態資源**
   - Netlify 會先嘗試提供實際文件
   - 只有找不到文件時才 fallback 到 `index.html`
   - `/assets/*` 文件存在，所以不會被重定向

## 為什麼這樣修復有效

**Netlify 處理順序**：
1. 檢查是否有匹配的靜態文件
2. 如果文件存在 → 直接返回（正確的 MIME type）
3. 如果文件不存在 → 執行 redirects 規則

**修復後的流程**：
- 請求 `/assets/SubordinateView-868nSYa1.js`
- Netlify 找到文件 → 返回 JavaScript（MIME type: application/javascript）✅
- 請求 `/some-spa-route`
- Netlify 找不到文件 → fallback 到 `index.html` ✅

## 部署步驟

### 1. 修改配置
```powershell
# 已完成 - netlify.toml 已更新
```

### 2. 部署到測試環境
```powershell
npm run build
$env:NETLIFY_SITE_ID = "480c7dd5-1159-4f1d-867a-0144272d1e0b"
netlify deploy --prod --dir=dist --no-build
```

### 3. 測試驗證
訪問測試環境：https://bejewelled-shortbread-a1aa30.netlify.app

測試步驟：
1. 清除瀏覽器緩存（Ctrl+Shift+Delete）
2. 登入系統
3. 訪問「團隊工作概況」頁面（會載入 SubordinateView）
4. 打開瀏覽器 Console（F12）
5. **確認沒有 MIME type 錯誤**
6. 重新整理頁面多次
7. 訪問其他頁面測試動態載入

### 4. 部署到生產環境
```powershell
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build
```

### 5. Git Commit
```powershell
git add netlify.toml
git commit -m "Fix: Dynamic module loading error - optimize Netlify config"
```

## 額外優化

### 緩存策略改進
**修改前**：所有文件都 no-cache
**修改後**：
- `/assets/*` → 永久緩存（文件有 hash）
- `/*.html` → 不緩存（確保最新版本）

**優點**：
- 減少不必要的網路請求
- 提升頁面載入速度
- 降低 Netlify 流量使用

## 測試方法

### 正常情況
```javascript
// 瀏覽器 Console 應該看到：
// [正常載入] GET /assets/SubordinateView-WZNl1I1M.js 200 (OK)
// Content-Type: application/javascript
```

### 錯誤情況（修復前）
```javascript
// 瀏覽器 Console 會看到：
// [錯誤] GET /assets/SubordinateView-868nSYa1.js 200 (OK)
// Content-Type: text/html  ← 錯誤！
// Failed to load module script: Expected JavaScript but got HTML
```

## 影響範圍

- ✅ 所有動態載入的組件（lazy loading）
- ✅ 所有靜態資源（CSS、圖片、字體）
- ✅ 改善頁面載入速度
- ✅ 減少不必要的網路請求

## 相關組件

使用 lazy loading 的組件（都會受益）：
- SubordinateView
- SubordinateRoutineView
- PersonnelView
- BulletinView
- ReportView
- CreateReportView
- FinanceView
- ForumView
- ChatSystem
- MemoView
- CalendarView
- SystemSettingsView
- DashboardView
- PerformanceView
- SOPView
- LeaveManagementView
- DepartmentDataView

## 關鍵教訓

1. **SPA 路由配置要小心**
   - 萬用路由不應該攔截靜態資源
   - Netlify 會自動處理文件存在性檢查

2. **緩存策略要合理**
   - 有 hash 的文件可以永久緩存
   - HTML 文件應該不緩存

3. **MIME type 很重要**
   - JavaScript 模組必須有正確的 Content-Type
   - 返回 HTML 會導致載入失敗

4. **測試要清除緩存**
   - 舊的配置可能被緩存
   - 使用無痕模式或清除緩存測試

## 預防措施

1. **部署前測試**
   - 先部署到測試環境
   - 清除緩存後測試所有頁面

2. **監控錯誤**
   - 檢查瀏覽器 Console
   - 注意 MIME type 相關錯誤

3. **配置審查**
   - 修改 `netlify.toml` 後仔細檢查
   - 確保不會影響靜態資源

## 參考資料

- [Netlify Redirects Documentation](https://docs.netlify.com/routing/redirects/)
- [Vite Build Output](https://vitejs.dev/guide/build.html)
- [HTTP Caching Best Practices](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
