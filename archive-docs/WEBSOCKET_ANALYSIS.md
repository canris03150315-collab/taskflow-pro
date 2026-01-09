# WebSocket 即時更新問題分析

**日期**: 2026-01-08  
**問題**: A 帳號更新 B 帳號資料後，B 帳號沒有即時看到更新

---

## 🔍 問題分析

### 前端 WebSocket 監聽 (App.tsx)

**事件監聽邏輯**：
```typescript
// 人員管理事件
if (msg.type === 'USER_CREATED' || msg.type === 'USER_UPDATED' || msg.type === 'USER_DELETED') {
  const updatedUsers = await api.users.getAll();
  setUsers(Array.isArray(updatedUsers) ? updatedUsers : []);
  toast.success('人員資料已更新');
}
```

✅ **前端監聽正常**：已正確監聽 `USER_UPDATED` 事件

### 後端 WebSocket 廣播 (users.js)

**事件發送邏輯**：
```javascript
req.wsServer.broadcastToAll('USER_UPDATED', {
    user: updatedUser,
    timestamp: new Date().toISOString()
});
```

✅ **後端廣播正常**：已正確發送 `USER_UPDATED` 事件

---

## 🐛 可能的問題原因

### 1. WebSocket 連接狀態
**問題**：用戶可能沒有成功連接到 WebSocket
- 檢查瀏覽器 Console 是否顯示 `[WebSocket] 已連接`
- 檢查是否有連接錯誤訊息

### 2. 認證問題
**問題**：WebSocket 連接可能沒有正確認證
```typescript
wsClient.connect(token || undefined).then(() => {
  console.log('[WebSocket] 已連接');
  wsClient.sendMessage('AUTH', { userId: currentUser.id });
  // ...
});
```

**檢查**：
- 後端日誌顯示：`✅ 用戶 undefined 已連接`
- 這表示用戶 ID 沒有正確傳遞

### 3. 事件過濾問題
**問題**：後端可能只廣播給特定用戶，而非所有連接的客戶端

### 4. 瀏覽器標籤頁狀態
**問題**：如果標籤頁在背景，某些瀏覽器可能會限制 WebSocket 事件

---

## 🔧 解決方案

### 方案 1：手動更新按鈕（已實現）✅
- 在側邊欄標題右側添加「更新資料」按鈕（桌面版）
- 在頂部標題右側添加更新圖標（手機版）
- 點擊後調用 `loadData()` 重新載入所有資料

### 方案 2：增強 WebSocket 認證（建議）
修改前端 WebSocket 連接邏輯，確保用戶 ID 正確傳遞：

```typescript
// 修改前
wsClient.sendMessage('AUTH', { userId: currentUser.id });

// 修改後
wsClient.sendMessage('AUTH', { 
  userId: currentUser.id,
  username: currentUser.username,
  role: currentUser.role
});
```

### 方案 3：添加 Console 調試（建議）
在前端添加更多調試訊息：

```typescript
const handleMessage = async (msg: WebSocketMessage) => {
  console.log('[WebSocket] 收到事件:', msg.type, msg.data);
  // ...
};
```

### 方案 4：檢查後端廣播邏輯
確認後端 `broadcastToAll` 是否真的廣播給所有連接的客戶端。

---

## 📊 測試步驟

### 測試 1：檢查 WebSocket 連接
1. 打開瀏覽器 Console (F12)
2. 登入系統
3. 查看是否有 `[WebSocket] 已連接` 訊息
4. 查看是否有 `[WebSocket] 連接到: wss://...` 訊息

### 測試 2：測試事件接收
1. 開啟兩個瀏覽器視窗（A 和 B）
2. A 視窗：修改用戶資料
3. B 視窗：查看 Console 是否收到 `[WebSocket] 收到事件: USER_UPDATED`
4. B 視窗：查看是否顯示 `人員資料已更新` toast 訊息

### 測試 3：測試手動更新
1. A 視窗：修改用戶資料
2. B 視窗：點擊「更新資料」按鈕
3. 確認資料已更新

---

## 🎯 當前狀態

### 已實現功能 ✅
- ✅ 側邊欄「更新資料」按鈕（桌面版）
- ✅ 頂部更新圖標（手機版）
- ✅ 點擊後重新載入所有資料
- ✅ 顯示「資料已更新」toast 訊息

### 待優化功能 ⚠️
- ⚠️ WebSocket 認證可能需要增強
- ⚠️ 需要更多 Console 調試訊息
- ⚠️ 需要檢查後端廣播邏輯

---

## 💡 建議

1. **短期解決方案**：使用手動更新按鈕（已實現）
2. **長期解決方案**：優化 WebSocket 連接和認證邏輯
3. **監控方案**：添加更多 Console 調試訊息，方便排查問題

---

**創建日期**: 2026-01-08  
**狀態**: 手動更新功能已實現，WebSocket 問題待進一步調查
