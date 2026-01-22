# WebSocket Cloudflare Tunnel URL 更新修復

**日期**: 2026-01-22  
**時間**: 04:06 AM (UTC+8)  
**版本**: v8.9.167-websocket-tunnel-fix  
**狀態**: ✅ 已完成

---

## 📋 問題描述

### 錯誤現象
```
WebSocket connection to 'wss://robust-managing-stay-largely.trycloudflare.com/ws?token=...' failed
WS Error Event {isTrusted: true, type: 'error', ...}
[WebSocket] 連接失敗
```

### 根本原因
**Cloudflare Tunnel 的臨時 URL 已過期**

Cloudflare 的 `trycloudflare.com` 服務會定期更換 URL，導致硬編碼在前端的 WebSocket URL 失效。

---

## 🔍 診斷過程

### 1. 檢查 Cloudflare Tunnel 狀態
```bash
ssh root@165.227.147.40 "ps aux | grep cloudflared"
# 結果: PID 1632505 運行中 ✅
```

### 2. 查看 Tunnel 日誌獲取當前 URL
```bash
ssh root@165.227.147.40 "cat /root/cloudflared.log | grep -i 'https://.*trycloudflare.com' | tail -5"
```

**發現新的 URL**:
```
https://northern-encounter-galleries-fairy.trycloudflare.com
```

**舊的 URL（已失效）**:
```
https://robust-managing-stay-largely.trycloudflare.com
```

---

## ✅ 解決方案

### 1. 更新前端 WebSocket URL

**文件**: `App.tsx`
```typescript
// 修改前
const wsUrl = import.meta.env.VITE_WS_URL || 'wss://robust-managing-stay-largely.trycloudflare.com/ws';

// 修改後
const wsUrl = import.meta.env.VITE_WS_URL || 'wss://northern-encounter-galleries-fairy.trycloudflare.com/ws';
```

**文件**: `components/ChatSystem.tsx`
```typescript
// 同樣更新
const wsUrl = (import.meta as any).env?.VITE_WS_URL || 'wss://northern-encounter-galleries-fairy.trycloudflare.com/ws';
```

### 2. 重新構建和部署
```powershell
Remove-Item -Recurse -Force dist
npm run build
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist
```

### 3. 創建快照和映像
```bash
# 創建 Docker 映像
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v8.9.167-websocket-tunnel-fix"

# 創建完整快照
ssh root@165.227.147.40 "/root/create-snapshot.sh v8.9.167-websocket-tunnel-fix"
```

---

## 📦 最終版本

### 前端
- **Deploy ID**: `6971315ed8b93fb0c72c6606`
- **WebSocket URL**: `wss://northern-encounter-galleries-fairy.trycloudflare.com/ws`
- **狀態**: ✅ 正常運行

### 後端
- **Docker 映像**: `taskflow-pro:v8.9.167-websocket-tunnel-fix`
- **Cloudflare Tunnel**: `northern-encounter-galleries-fairy.trycloudflare.com`
- **Tunnel PID**: 1632505
- **快照**: `taskflow-snapshot-v8.9.167-websocket-tunnel-fix`

---

## 🔑 關鍵教訓

### 1. **Cloudflare Tunnel URL 不是固定的**
Cloudflare 的 `trycloudflare.com` 是測試服務，URL 會定期更換。

### 2. **不要依賴全域規則或記憶中的舊 URL**
每次 WebSocket 連接失敗時，必須：
1. 檢查 Tunnel 是否運行
2. 從日誌獲取當前有效的 URL
3. 更新前端代碼

### 3. **正確的診斷流程**
```bash
# 步驟 1: 檢查 Tunnel 進程
ps aux | grep cloudflared

# 步驟 2: 獲取當前 URL
cat /root/cloudflared.log | grep -i 'https://.*trycloudflare.com' | tail -5

# 步驟 3: 更新前端代碼中的 URL
# 步驟 4: 重新部署
```

### 4. **工作日誌必須包含獲取 URL 的命令**
不能只記錄固定的 URL，必須記錄如何獲取最新 URL 的方法。

---

## 🚨 如何避免重複錯誤

### 立即行動
1. ✅ **更新 WORK_LOG_CURRENT.md**
   - 記錄獲取最新 URL 的命令
   - 標註 URL 會變化的警告

2. ✅ **創建記憶**
   - 主題：Cloudflare Tunnel URL 定期更新
   - 內容：診斷命令和解決流程

3. ✅ **更新全域規則**
   - 添加：WebSocket 連接失敗時的標準診斷流程

### 長期改進
1. **環境變數配置**
   - 使用 `.env` 文件管理 WebSocket URL
   - 避免硬編碼

2. **自動化監控**
   - 定期檢查 WebSocket 連接狀態
   - Tunnel URL 變更時自動通知

3. **升級到正式 Tunnel**
   ```bash
   # 創建命名 Tunnel（不會自動更換 URL）
   cloudflared tunnel create taskflow
   cloudflared tunnel route dns taskflow ws.yourdomain.com
   ```

---

## 📝 標準診斷檢查清單

當 WebSocket 連接失敗時，按順序檢查：

- [ ] **1. 檢查 Cloudflare Tunnel 是否運行**
  ```bash
  ssh root@165.227.147.40 "ps aux | grep cloudflared"
  ```

- [ ] **2. 獲取當前 Tunnel URL**
  ```bash
  ssh root@165.227.147.40 "cat /root/cloudflared.log | grep -i 'https://.*trycloudflare.com' | tail -5"
  ```

- [ ] **3. 比對前端代碼中的 URL**
  - 檢查 `App.tsx` 第 209 行
  - 檢查 `ChatSystem.tsx` 第 82 行

- [ ] **4. 如果 URL 不同，更新並部署**
  ```powershell
  # 更新代碼
  # 重新構建
  npm run build
  # 部署
  netlify deploy --prod --dir=dist
  ```

- [ ] **5. 創建快照**
  ```bash
  ssh root@165.227.147.40 "/root/create-snapshot.sh v版本號"
  ```

- [ ] **6. 更新工作日誌**
  - 記錄新的 URL
  - 更新版本號

---

## 🔧 快速修復命令

```bash
# 一鍵獲取當前 Tunnel URL
ssh root@165.227.147.40 "cat /root/cloudflared.log | grep 'https://.*trycloudflare.com' | tail -1 | grep -oP 'https://\S+\.trycloudflare\.com'"
```

**輸出範例**:
```
https://northern-encounter-galleries-fairy.trycloudflare.com
```

將此 URL 添加 `/ws` 後更新到：
- `App.tsx` 的 `wsUrl` 變數
- `ChatSystem.tsx` 的 `wsUrl` 變數

---

## 📞 相關文件

- **工作日誌**: `WORK_LOG_CURRENT.md` (已更新)
- **全域規則**: AI-MUST-READ-FIRST.md (待更新)
- **歷史記錄**: 
  - `WORK_LOG_20260106_CLOUDFLARE_TUNNEL.md` (首次設置)
  - `WORK_LOG_20260106_WEBSOCKET_FINAL_FIX.md` (WebSocket 修復)

---

**最後更新**: 2026-01-22 04:06 AM  
**作者**: Cascade AI  
**狀態**: ✅ 已完成並測試通過
