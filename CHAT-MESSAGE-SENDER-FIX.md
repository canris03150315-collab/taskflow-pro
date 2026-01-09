# 聊天訊息發送者身份錯誤修復方案

**問題**: Seven 發送的訊息顯示為測試人員主管發送  
**日期**: 2026-01-02 06:10 AM  
**優先級**: 🔴 高 - 影響聊天功能

---

## 🔍 問題診斷

### 可能原因

1. **前端 currentUser 狀態錯誤**
   - App.tsx 載入用戶時，currentUser 被設置為錯誤的用戶
   - Token 解碼後的用戶 ID 不正確

2. **後端認證中間件問題**
   - authenticateToken 返回錯誤的用戶資訊
   - 資料庫查詢返回錯誤的用戶

3. **前端顯示邏輯問題**
   - isMe 判斷錯誤
   - userName 顯示錯誤

### 需要檢查的點

```typescript
// 1. 前端 - 檢查 currentUser 是否正確
console.log('Current User:', currentUser);

// 2. 前端 - 檢查訊息的 userId
console.log('Message userId:', msg.userId);
console.log('Is Me:', msg.userId === currentUser.id);

// 3. 後端 - 檢查 req.user
console.log('Backend currentUser:', req.user);
```

---

## 🔧 修復方案（不會破壞其他功能）

### 方案 1: 添加調試日誌（推薦先執行）

**目的**: 確認問題根源，不修改任何邏輯

```typescript
// 在 ChatSystem.tsx 的 handleSendMessage 中添加
console.log('[DEBUG] Sending message as:', currentUser.id, currentUser.name);

// 在訊息顯示處添加
console.log('[DEBUG] Message:', msg.id, 'userId:', msg.userId, 'userName:', msg.userName);
console.log('[DEBUG] Current user:', currentUser.id, currentUser.name);
console.log('[DEBUG] Is me:', msg.userId === currentUser.id);
```

**後端添加日誌**：
```javascript
// 在 chat.js 的發送訊息處添加
console.log('[DEBUG] Sending message - User:', currentUser.id, currentUser.name);
console.log('[DEBUG] Message will be saved with user_id:', currentUser.id);
```

### 方案 2: 修復前端 currentUser 載入

**如果問題是 App.tsx 的 token 驗證**：

```typescript
// App.tsx - 確保正確解碼 token
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('[DEBUG] Token payload:', payload);
const currentUserData = userData.find(u => u.id === payload.id);
console.log('[DEBUG] Found user:', currentUserData);
```

### 方案 3: 確保後端返回正確的用戶資訊

**檢查 auth middleware**：
```javascript
// middleware/auth.js
const userRow = await db.get('SELECT * FROM users WHERE id = ?', [decoded.id]);
console.log('[DEBUG] Auth middleware - decoded.id:', decoded.id);
console.log('[DEBUG] Auth middleware - found user:', userRow.id, userRow.name);
```

---

## 📋 安全修復步驟（避免修A壞B）

### 步驟 1: 添加調試日誌（不修改邏輯）

1. 在前端添加 console.log
2. 在後端添加 console.log
3. 測試發送訊息
4. 查看瀏覽器控制台和伺服器日誌

### 步驟 2: 根據日誌確認問題

- 如果 `currentUser.id` 不正確 → 修復 App.tsx
- 如果 `req.user.id` 不正確 → 修復 auth middleware
- 如果 `msg.userId` 不正確 → 修復 chat.js

### 步驟 3: 針對性修復

**只修復確認有問題的部分**，不動其他代碼。

### 步驟 4: 測試所有功能

- ✅ 登入功能
- ✅ 打卡功能
- ✅ 聊天發送
- ✅ 聊天顯示
- ✅ 通訊錄
- ✅ 重新整理

---

## 🎯 立即執行的診斷命令

```bash
# 1. 查看最近的聊天日誌
ssh root@165.227.147.40 "docker logs taskflow-pro 2>&1 | grep -i 'sending message\|user:' | tail -20"

# 2. 檢查 auth middleware 是否正常
ssh root@165.227.147.40 "docker exec taskflow-pro cat /app/dist/middleware/auth.js | grep -A 5 'userRow.id'"

# 3. 檢查 chat.js 發送邏輯
ssh root@165.227.147.40 "docker exec taskflow-pro cat /app/dist/routes/chat.js | grep -A 10 'currentUser.id, content'"
```

---

## ⚠️ 注意事項

1. **不要同時修改多個文件**
2. **每次修改後立即測試**
3. **保留修改前的備份**
4. **使用 console.log 而不是直接修改邏輯**
5. **確認問題根源後再修復**

---

## 📝 測試清單

修復後必須測試：

- [ ] Seven 發送訊息顯示正確
- [ ] 測試人員主管發送訊息顯示正確
- [ ] 群組聊天正常
- [ ] 私聊正常
- [ ] 登入功能正常
- [ ] 打卡功能正常
- [ ] 通訊錄正常
- [ ] 重新整理不登出

---

**建議**: 先添加調試日誌，確認問題根源後再修復。
