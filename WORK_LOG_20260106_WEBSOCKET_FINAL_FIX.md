# WebSocket 連接最終修復方案

**日期**: 2026-01-06  
**版本**: v8.9.20-websocket-direct-wss  
**狀態**: ✅ 已完成（需要用戶操作）

---

## 📋 問題根源

經過深入診斷，發現 **Netlify 免費方案不支援 WebSocket 反向代理**。

### 嘗試過的方案

1. ❌ **ws:// 直接連接** - HTTPS 網站無法連接 WS (Mixed Content)
2. ❌ **wss:// 直接連接** - 瀏覽器不信任自簽名證書
3. ❌ **Netlify WebSocket 代理** - Netlify 免費方案不支援

---

## 🎯 最終解決方案

### 方案：直接連接 + 用戶接受證書

**架構**:
```
用戶瀏覽器 (HTTPS)
    ↓
直接連接 WSS (需要接受自簽名證書)
    ↓
後端伺服器 (WSS/HTTPS)
```

### 實施步驟

#### 1. 前端配置 (App.tsx)

```typescript
// 直接連接到後端 WSS
const wsUrl = import.meta.env.VITE_WS_URL || 'wss://165.227.147.40:3000/ws';
console.log('[WebSocket] 連接到:', wsUrl);
console.log('[WebSocket] 如果連接失敗，請先訪問 https://165.227.147.40:3000 接受證書');
```

#### 2. 用戶操作（必須）

**步驟 1**: 開啟新分頁，訪問：
```
https://165.227.147.40:3000
```

**步驟 2**: 瀏覽器會顯示安全警告，點擊：
- Chrome: "進階" → "繼續前往 165.227.147.40 (不安全)"
- Firefox: "進階" → "接受風險並繼續"
- Edge: "進階" → "繼續前往 165.227.147.40 (不安全)"

**步驟 3**: 看到 API 回應後，關閉該分頁

**步驟 4**: 重新整理主頁面，WebSocket 應該可以正常連接

---

## 📦 部署流程

### 1. 修改前端代碼
```typescript
// App.tsx 第 187 行
const wsUrl = import.meta.env.VITE_WS_URL || 'wss://165.227.147.40:3000/ws';
```

### 2. 創建用戶指南
創建 `WEBSOCKET_SETUP_GUIDE.md` 文件，提供詳細設定說明

### 3. 構建並部署
```powershell
Remove-Item -Recurse -Force dist
npm run build
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build
```
- Deploy ID: `695cc50284236666f915c581`

### 4. 創建快照
```bash
/root/create-snapshot.sh v8.9.20-websocket-direct-wss
```

---

## ✅ 驗證方法

### 檢查 Console 日誌

**成功連接**:
```
[WebSocket] 連接到: wss://165.227.147.40:3000/ws
[WebSocket] 已連接
```

**連接失敗**:
```
[WebSocket] 連接到: wss://165.227.147.40:3000/ws
[WebSocket] 如果連接失敗，請先訪問 https://165.227.147.40:3000 接受證書
WebSocket connection failed
```

---

## 🔧 技術說明

### 為什麼需要用戶操作？

1. **自簽名證書**: 後端使用自簽名 SSL 證書
2. **瀏覽器安全策略**: 瀏覽器預設不信任自簽名證書
3. **手動信任**: 用戶需要手動訪問並接受證書

### 為什麼不能自動化？

瀏覽器的安全機制不允許程式碼自動接受不受信任的證書，這是為了保護用戶安全。

---

## 🎯 影響範圍

### 需要用戶操作
- ✅ **首次使用**: 需要接受證書（一次性操作）
- ✅ **後續使用**: 無需再次操作（證書已信任）

### 功能狀態
所有即時更新功能在接受證書後可正常使用：
- ✅ 人員、任務、財務、部門管理
- ✅ 公告、備忘錄、建議、報表系統
- ✅ 出勤系統、SOP 文檔
- ✅ 總計 10 個模組，30 種事件

---

## 📝 最終版本

- **後端**: `taskflow-pro:v8.9.17-all-modules-realtime` (無需修改)
- **前端**: Deploy ID `695cc50284236666f915c581`
- **快照**: `taskflow-snapshot-v8.9.20-websocket-direct-wss-XXXXXX.tar.gz`
- **用戶指南**: `WEBSOCKET_SETUP_GUIDE.md`
- **狀態**: ✅ 已完成

---

## 🚀 長期改進方案

### 選項 1：使用 Let's Encrypt（推薦）
為後端申請免費的有效 SSL 證書，無需用戶手動操作

**步驟**:
```bash
# 安裝 certbot
apt-get install certbot

# 申請證書
certbot certonly --standalone -d yourdomain.com

# 配置後端使用證書
```

### 選項 2：使用 Cloudflare Tunnel
通過 Cloudflare 提供有效的 HTTPS，無需手動操作

### 選項 3：升級 Netlify 方案
升級到支援 WebSocket 代理的方案（需付費）

---

## 🔑 關鍵教訓

1. **Netlify 限制** - 免費方案不支援 WebSocket 代理
2. **自簽名證書** - 需要用戶手動信任
3. **瀏覽器安全** - 無法程式化繞過安全限制
4. **用戶溝通** - 提供清晰的設定指南很重要
5. **長期規劃** - 應該使用有效的 SSL 證書

---

## 📞 相關文件

- **用戶指南**: `WEBSOCKET_SETUP_GUIDE.md`
- **第一次修復**: `WORK_LOG_20260106_WEBSOCKET_WSS_FIX.md`
- **第二次修復**: `WORK_LOG_20260106_WEBSOCKET_NETLIFY_PROXY.md`
- **即時更新實施**: `WORK_LOG_20260106_ALL_MODULES_REALTIME.md`

---

## 📋 用戶操作清單

請按照以下步驟操作：

1. ✅ 開啟新分頁
2. ✅ 訪問 `https://165.227.147.40:3000`
3. ✅ 點擊 "進階" 或 "Advanced"
4. ✅ 點擊 "繼續前往" 或 "Proceed"
5. ✅ 看到 JSON 回應後關閉分頁
6. ✅ 重新整理主頁面
7. ✅ 檢查 Console 確認 WebSocket 已連接

---

**最後更新**: 2026-01-06  
**作者**: Cascade AI
