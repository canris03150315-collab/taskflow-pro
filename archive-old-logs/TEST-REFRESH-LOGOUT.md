# 測試重新整理登出問題

**日期**: 2026-01-02 06:30 AM

---

## 🔍 診斷步驟

### 步驟 1: 使用無痕模式測試

**這是最可靠的測試方法**：

```
1. 完全關閉所有瀏覽器視窗
2. 按 Ctrl+Shift+N 開啟無痕視窗
3. 訪問：https://transcendent-basbousa-6df2d2.netlify.app
4. 按 F12 打開開發者工具
5. 切換到 Console 標籤
6. 登入 Seven 帳號
7. 登入後查看 Console，應該看到 token 被保存
8. 按 F5 重新整理
9. 查看 Console 輸出
```

### 步驟 2: 檢查 Console 日誌

**登入時應該看到**：
```
[無特定日誌，但 localStorage 應該有 auth_token]
```

**重新整理時應該看到**：
```
[App] Restoring session for user: admin-1766955365557
[App] Session restored: Seven
```

**如果看到錯誤**：
```
[App] Token invalid (401), clearing
或
[App] Failed to restore session, but keeping token: [錯誤訊息]
```

### 步驟 3: 檢查 localStorage

在 Console 中輸入：
```javascript
localStorage.getItem('auth_token')
```

應該返回一個 JWT token（長字串）。

### 步驟 4: 手動測試 Token 解碼

在 Console 中輸入：
```javascript
const token = localStorage.getItem('auth_token');
if (token) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('Token payload:', payload);
}
```

應該看到用戶 ID 等資訊。

---

## 🐛 可能的問題

### 問題 1: Token 沒有被保存

**症狀**: `localStorage.getItem('auth_token')` 返回 `null`

**原因**: 登入 API 沒有返回 token 或前端沒有保存

**解決**: 檢查 `api.ts` 的 login 函數

### 問題 2: Token 被錯誤清除

**症狀**: 登入後有 token，重新整理後 token 消失

**原因**: 
- API 調用失敗（網絡問題、CORS、404 等）
- 錯誤處理邏輯清除了 token

**解決**: 查看 Console 錯誤訊息

### 問題 3: 用戶資料載入失敗

**症狀**: Token 存在，但 `setCurrentUser` 沒有被調用

**原因**:
- `api.users.getAll()` 失敗
- 找不到對應的用戶
- 權限問題（SUPERVISOR 限制）

**解決**: 檢查 `/api/users` 是否返回所有用戶

---

## 🔧 臨時解決方案

如果問題持續，可以使用更簡單的方法：

### 方案 A: 直接從 token 恢復用戶

```typescript
const token = localStorage.getItem('auth_token');
if (token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // 直接使用 token 中的用戶資訊
        setCurrentUser({
            id: payload.id,
            name: payload.name,
            role: payload.role,
            department: payload.department,
            // ... 其他欄位
        });
    } catch (error) {
        localStorage.removeItem('auth_token');
    }
}
```

### 方案 B: 添加重試機制

```typescript
const token = localStorage.getItem('auth_token');
if (token) {
    let retries = 3;
    while (retries > 0) {
        try {
            const users = await api.users.getAll();
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentUserData = users.find(u => u.id === payload.id);
            if (currentUserData) {
                setCurrentUser(currentUserData);
                break;
            }
        } catch (error) {
            retries--;
            if (retries === 0) {
                localStorage.removeItem('auth_token');
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}
```

---

## 📝 請提供以下資訊

1. **使用無痕模式測試後的 Console 截圖**
2. **localStorage 中是否有 auth_token？**
3. **重新整理時 Console 顯示什麼？**
4. **Network 標籤中 `/api/users` 請求的狀態碼？**

有了這些資訊，我可以精確定位問題。

---

**重要**: 請務必使用無痕模式測試，避免緩存干擾。
