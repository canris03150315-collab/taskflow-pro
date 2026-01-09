# 一般員工重新整理被登出問題修復

**日期**: 2026-01-10  
**版本**: v8.9.99-employee-refresh-fix

## 問題描述

一般員工（EMPLOYEE）重新整理頁面後會被登出，需要重新登入。

## 根本原因

**後端權限限制**：
- `GET /api/users` 路由需要 BOSS/MANAGER/SUPERVISOR 權限
- 一般員工（EMPLOYEE）無權訪問此 API

**前端 session 恢復邏輯**（`App.tsx` 第 122-124 行）：
```typescript
// Fetch all users to find current user
const users = await api.users.getAll();  // ❌ EMPLOYEE 無權訪問
const currentUserData = users.find(u => u.id === payload.id);
```

**問題流程**：
1. 一般員工重新整理頁面
2. 前端嘗試從 token 恢復 session
3. 調用 `api.users.getAll()` → 403 Forbidden
4. API 返回空陣列 `[]`（`api.ts` 第 145-147 行 catch 處理）
5. `find()` 找不到用戶 → `currentUserData = undefined`
6. 清除 token → 被登出

## 解決方案

**使用 GET /users/:id 替代 GET /users**：
- `GET /users/:id` 有 `requireSelfOrAdmin` 中間件
- 允許用戶查看自己的資料
- 不需要管理員權限

## 修復代碼

**文件**: `App.tsx` 第 114-143 行

```typescript
// 修改前
if (!skipUserRestore) {
    const token = localStorage.getItem('auth_token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('[App] Restoring session for user:', payload.id);
            
            // ❌ 需要管理員權限
            const users = await api.users.getAll();
            const currentUserData = users.find(u => u.id === payload.id);
            
            if (currentUserData) {
                console.log('[App] Session restored:', currentUserData.name);
                setCurrentUser(currentUserData);
            } else {
                console.warn('[App] User not found in database, clearing token');
                localStorage.removeItem('auth_token');
            }
        } catch (error) {
            // ...
        }
    }
}

// 修改後
if (!skipUserRestore) {
    const token = localStorage.getItem('auth_token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('[App] Restoring session for user:', payload.id);
            
            // ✅ 使用 GET /users/:id - 允許查看自己的資料
            const currentUserData = await api.users.getById(payload.id);
            
            if (currentUserData) {
                console.log('[App] Session restored:', currentUserData.name);
                setCurrentUser(currentUserData);
            } else {
                console.warn('[App] User not found in database, clearing token');
                localStorage.removeItem('auth_token');
            }
        } catch (error) {
            // Only clear token if it's a 401 (unauthorized)
            if (error instanceof Error && error.message.includes('401')) {
                console.error('[App] Token invalid (401), clearing');
                localStorage.removeItem('auth_token');
            } else {
                // For other errors (network, etc), keep token and try again later
                console.warn('[App] Failed to restore session, but keeping token:', error);
            }
        }
    }
}
```

## 需要添加的 API 方法

**文件**: `services/api.ts`

在 `users` 對象中添加：
```typescript
users: {
    getAll: async (): Promise<User[]> => { /* 現有代碼 */ },
    getById: async (id: string): Promise<User | null> => {
        try {
            return await request<User>('GET', `/users/${id}`);
        } catch (error) {
            console.error('Failed to get user by id', error);
            return null;
        }
    },
    create: async (user: User) => { /* 現有代碼 */ },
    // ...
}
```

## 部署步驟

### 1. 修改前端代碼
```powershell
# 編輯 App.tsx 和 api.ts
```

### 2. 部署到測試環境
```powershell
npm run build
$env:NETLIFY_SITE_ID = "480c7dd5-1159-4f1d-867a-0144272d1e0b"
netlify deploy --prod --dir=dist --no-build
```

### 3. 測試驗證
- 使用一般員工帳號登入測試環境
- 重新整理頁面
- 確認不會被登出

### 4. 部署到生產環境
```powershell
npm run build
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build
```

### 5. Git Commit
```powershell
git add .
git commit -m "Fix: Employee logout on refresh - use GET /users/:id instead of GET /users"
```

## 測試方法

1. 使用一般員工帳號登入
2. 重新整理頁面（F5 或 Ctrl+R）
3. 確認仍保持登入狀態
4. 檢查瀏覽器 Console：
   - 應該看到 `[App] Restoring session for user: xxx`
   - 應該看到 `[App] Session restored: 用戶名`
   - 不應該看到 403 錯誤

## 影響範圍

- ✅ 一般員工（EMPLOYEE）重新整理不會被登出
- ✅ 其他角色（BOSS/MANAGER/SUPERVISOR）不受影響
- ✅ 無需修改後端代碼

## 關鍵教訓

1. **權限檢查**：前端調用 API 時要考慮用戶權限
2. **Session 恢復**：應使用最小權限的 API（GET /users/:id 而非 GET /users）
3. **錯誤處理**：API 失敗時要正確處理，避免誤判
4. **測試覆蓋**：需要測試不同角色的用戶體驗

## 相關文件

- `App.tsx` - Session 恢復邏輯
- `services/api.ts` - API 調用
- 後端 `/app/dist/routes/users.js` - 權限控制
