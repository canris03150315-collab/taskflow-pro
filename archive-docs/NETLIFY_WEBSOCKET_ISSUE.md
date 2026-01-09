# Netlify WebSocket 代理問題

**日期**: 2026-01-06  
**狀態**: ⚠️ 需要確認

---

## 問題

即使升級 Netlify 方案後，WebSocket 反向代理仍然失敗。

### 錯誤訊息
```
WebSocket connection to 'wss://transcendent-basbousa-6df2d2.netlify.app/ws' failed
```

---

## 可能原因

### 1. Netlify 方案限制
即使升級了方案，Netlify 的 WebSocket 支援可能有以下限制：
- 需要特定的方案等級（Pro 或 Business）
- 需要額外配置或啟用功能
- 某些區域或配置不支援

### 2. 配置問題
- netlify.toml 配置可能不正確
- WebSocket 路徑可能需要特殊處理
- 可能需要使用 Netlify Functions

---

## 解決方案選項

### 選項 1：確認 Netlify 方案詳情
請確認您升級到哪個方案：
- **Starter** ($19/月) - 不支援 WebSocket 代理
- **Pro** ($99/月) - 可能支援，需要額外配置
- **Business** ($249/月) - 完整支援

### 選項 2：使用直接連接（臨時方案）
回到之前的方案，用戶需要手動接受證書：
```typescript
const wsUrl = 'wss://165.227.147.40:3000/ws';
```

用戶操作：
1. 訪問 https://165.227.147.40:3000
2. 接受自簽名證書
3. 重新整理主頁面

### 選項 3：使用 Cloudflare Tunnel（推薦）
使用 Cloudflare Tunnel 提供有效的 HTTPS/WSS：
```bash
# 安裝 cloudflared
# 配置 tunnel
# 獲得有效的域名和證書
```

### 選項 4：申請 Let's Encrypt 證書
為後端申請免費的有效證書：
```bash
# 安裝 certbot
apt-get install certbot

# 申請證書（需要域名）
certbot certonly --standalone -d yourdomain.com

# 配置後端使用證書
```

### 選項 5：使用其他部署方式
- Vercel（可能有類似限制）
- Railway（支援 WebSocket）
- Render（支援 WebSocket）
- 自建 Nginx 反向代理

---

## 建議行動

### 立即方案（回到 v8.9.20）
使用直接連接 + 證書接受的方式，雖然需要用戶操作，但功能可用。

### 長期方案（推薦）
1. **使用 Cloudflare Tunnel** - 最簡單且免費
2. **申請 Let's Encrypt** - 如果有域名
3. **更換部署平台** - 如果預算允許

---

## 下一步

請告訴我：
1. 您升級到 Netlify 的哪個方案？
2. 您希望使用哪個解決方案？
   - A. 回到直接連接（需要用戶操作）
   - B. 設置 Cloudflare Tunnel
   - C. 申請 Let's Encrypt 證書
   - D. 更換部署平台

---

**最後更新**: 2026-01-06
