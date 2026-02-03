# 前端 Token 問題診斷

## 🔍 問題現象
用戶在瀏覽器 Console 執行 `localStorage.getItem('token')` 返回 `null`

## 📊 診斷分析

### 1. 這是正確的行為！
**原因**：系統使用的 key 是 `'auth_token'`，不是 `'token'`

**驗證方法**：
在瀏覽器 Console 中執行：
```javascript
console.log('auth_token:', localStorage.getItem('auth_token'));
```

如果返回一個 JWT Token（長字串），表示用戶已登入。

### 2. 前端代碼已修復
所有 Revenue 組件已修復為使用 `'auth_token'`：
- ✅ RevenueUploadTab.tsx - 已修復
- ✅ RevenueStatsTab.tsx - 已修復
- ✅ RevenueHistoryTab.tsx - 已修復
- ✅ RevenueDateStatsTab.tsx - 已修復

### 3. 部署狀態
- ✅ 前端已重新編譯
- ✅ 已部署到 Netlify (Deploy ID: 697f6401c4c1ac78aef26a35)

## 🎯 用戶需要做什麼

### 步驟 1：清除瀏覽器緩存
**重要**：必須清除緩存才能載入新版本的前端代碼

**方法 1：硬重新整理**
- Windows: `Ctrl + Shift + R` 或 `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**方法 2：清除緩存**
1. 按 F12 打開開發者工具
2. 右鍵點擊重新整理按鈕
3. 選擇「清除快取並強制重新整理」

### 步驟 2：確認 Token 存在
在瀏覽器 Console 中執行：
```javascript
console.log('auth_token:', localStorage.getItem('auth_token'));
```

**預期結果**：
- 如果已登入：顯示一個長字串（JWT Token）
- 如果未登入：顯示 `null`

### 步驟 3：如果 auth_token 為 null
**表示用戶未登入**，需要：
1. 登出（如果顯示已登入）
2. 重新登入
3. 確認登入成功後再測試平台營收功能

## 🔧 技術細節

### localStorage Key 對照表
| 功能 | Key | 說明 |
|------|-----|------|
| 認證 Token | `auth_token` | ✅ 正確 |
| 用戶資訊 | `user` | ✅ 正確 |
| ~~舊的 Token~~ | `token` | ❌ 已廢棄 |

### 系統使用的正確 Key
```typescript
// 正確的方式（系統使用）
const token = localStorage.getItem('auth_token');

// 錯誤的方式（已修復）
const token = localStorage.getItem('token'); // ❌
```

## 📝 常見問題

### Q1: 為什麼 localStorage.getItem('token') 返回 null？
**A**: 因為系統使用的 key 是 `'auth_token'`，不是 `'token'`。這是正確的行為。

### Q2: 我已經登入了，為什麼還是 401？
**A**: 可能是瀏覽器緩存問題。請：
1. 清除瀏覽器緩存
2. 硬重新整理頁面（Ctrl + Shift + R）
3. 確認 `localStorage.getItem('auth_token')` 有值

### Q3: 如何確認新版本已載入？
**A**: 在瀏覽器 Console 中執行：
```javascript
// 檢查 RevenueUploadTab 是否使用正確的 key
// 如果看到 'auth_token' 表示新版本已載入
```

或者檢查 Network 標籤，確認 JavaScript 文件的時間戳是最新的。

## ✅ 解決方案總結

1. **清除瀏覽器緩存**（最重要）
2. **硬重新整理頁面**
3. **確認使用 `'auth_token'` 而不是 `'token'`**
4. **如果 auth_token 為 null，重新登入**

## 🎯 驗證步驟

執行以下命令確認：
```javascript
// 1. 檢查 auth_token
console.log('auth_token:', localStorage.getItem('auth_token'));

// 2. 檢查 user
console.log('user:', localStorage.getItem('user'));

// 3. 列出所有 localStorage keys
console.log('All keys:', Object.keys(localStorage));
```

如果 `auth_token` 有值，表示已登入，可以正常使用平台營收功能。
