# 工作日誌 - 2026-01-02 權限保存問題完整修復記錄

**日期**: 2026-01-02 06:53 AM - 07:37 AM  
**狀態**: ✅ 已完全修復  
**最終版本**: 
- 前端: Netlify Deploy ID `6957034fe61b2dcefbcde3a8`
- 後端: Docker Image `taskflow-pro:v2.4.1-all-selects-fixed`
- 備份: 待執行

---

## 📋 問題描述

**症狀**: 
- 管理員給予其他用戶權限時，點擊保存後看似成功
- 但重新整理頁面後，權限勾選框全部變成空的
- 權限沒有正確保存或顯示

**影響範圍**:
- 所有用戶的權限管理功能
- 無法正確設置特權（創建任務、管理用戶、系統重置等）

---

## 🔍 根本原因分析

### 問題 1: 後端 GET /users 路由缺少 permissions 欄位

**位置**: `/app/dist/routes/users.js` - GET /users 路由

**錯誤代碼**:
```javascript
// ❌ 錯誤
let query = 'SELECT id, name, role, department, avatar, username, created_at, updated_at FROM users';
// 缺少 permissions 欄位！
```

**影響**:
1. 前端調用 `GET /users` 獲取用戶列表
2. 後端返回的用戶對象**沒有 permissions 欄位**
3. 前端的 `editingUser` 沒有 permissions 數據
4. 編輯用戶時，`{ ...editingUser, ...userData }` 合併數據
5. 因為 `editingUser` 沒有 permissions，即使 `userData` 有新的 permissions，合併後也可能丟失
6. 更新時 permissions 無法正確保存或顯示

### 問題 2: 後端 PUT /users/:id 路由返回數據缺少 permissions

**位置**: `/app/dist/routes/users.js` - PUT /users/:id 路由

**錯誤代碼**:
```javascript
// ❌ 錯誤
const updatedUser = await db.get('SELECT id, name, role, department, avatar, username, created_at, updated_at FROM users WHERE id = ?', [id]);
// 缺少 permissions 欄位！
```

**影響**:
- 更新用戶後，返回的用戶對象沒有 permissions
- 前端無法正確更新本地狀態

### 問題 3: 前端 API 返回數據處理不正確

**位置**: `services/api.ts` - users.update 函數

**錯誤代碼**:
```typescript
// ❌ 錯誤
update: (user: User) => request<User>('PUT', `/users/${user.id}`, user)
// 沒有處理後端返回的 {user, message} 結構
```

**影響**:
- 後端返回 `{user: {...}, message: "..."}`
- 前端直接使用整個 response，導致獲取到的不是用戶對象

---

## 🔧 修復方案

### 修復 1: 後端 GET /users 添加 permissions 欄位

**修復命令**:
```bash
ssh root@165.227.147.40 "docker exec taskflow-pro sed -i 's/username, created_at, updated_at FROM users/username, permissions, created_at, updated_at FROM users/g' /app/dist/routes/users.js"
```

**修復後代碼**:
```javascript
// ✅ 正確
let query = 'SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users';
```

### 修復 2: 後端 PUT /users/:id 添加 permissions 欄位

**修復命令**:
```bash
ssh root@165.227.147.40 "docker exec taskflow-pro sed -i 's/SELECT id, name, role, department, avatar, username, created_at, updated_at FROM users WHERE id = ?/SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users WHERE id = ?/g' /app/dist/routes/users.js"
```

**修復後代碼**:
```javascript
// ✅ 正確
const updatedUser = await db.get('SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users WHERE id = ?', [id]);
```

### 修復 3: 後端 GET /users/department/:departmentId 添加 permissions 欄位

**修復命令**:
```bash
ssh root@165.227.147.40 "docker exec taskflow-pro sed -i 's/SELECT id, name, role, department, avatar, username, created_at, updated_at FROM users WHERE department/SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users WHERE department/g' /app/dist/routes/users.js"
```

### 修復 4: 前端 API 正確處理返回數據

**修復文件**: `services/api.ts`

**修復前**:
```typescript
update: (user: User) => request<User>('PUT', `/users/${user.id}`, user)
```

**修復後**:
```typescript
update: async (user: User) => {
    const response = await request<{ user: User, message: string }>('PUT', `/users/${user.id}`, user);
    return response.user;  // ← 返回 user 對象
}
```

### 修復 5: 前端 App.tsx 使用後端返回的完整數據

**修復文件**: `App.tsx`

**修復前**:
```typescript
await api.users.update(dataToSend);
const updatedUser = { ...editingUser, ...userData };  // ❌ 本地合併
setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u));
```

**修復後**:
```typescript
const response = await api.users.update(dataToSend);
const updatedUser = response.user || response;  // ✅ 使用後端返回的完整數據
setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u));
```

---

## 📝 完整修復流程

### 步驟 1: 修復後端所有 SELECT 語句

```bash
# 修復 GET /users
ssh root@165.227.147.40 "docker exec taskflow-pro sed -i 's/username, created_at, updated_at FROM users/username, permissions, created_at, updated_at FROM users/g' /app/dist/routes/users.js"

# 驗證修復
ssh root@165.227.147.40 "docker exec taskflow-pro grep 'let query =' /app/dist/routes/users.js"
# 應該顯示: let query = 'SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users';
```

### 步驟 2: 重啟容器

```bash
ssh root@165.227.147.40 "docker restart taskflow-pro"
```

### 步驟 3: 創建新 Docker 映像（重要！）

```bash
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v2.4.1-all-selects-fixed"
```

### 步驟 4: 使用新映像重啟容器

```bash
ssh root@165.227.147.40 "docker stop taskflow-pro && docker rm taskflow-pro && docker run -d --name taskflow-pro -p 3000:3000 -e PORT=3000 -v /app/data:/app/data taskflow-pro:v2.4.1-all-selects-fixed"
```

### 步驟 5: 修復前端 API

**文件**: `services/api.ts`

```typescript
update: async (user: User) => {
    const response = await request<{ user: User, message: string }>('PUT', `/users/${user.id}`, user);
    return response.user;
}
```

### 步驟 6: 前端構建和部署

```powershell
cd "C:\Users\USER\Downloads\公司內部"
Remove-Item -Recurse -Force dist
npm run build
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build
```

### 步驟 7: 測試驗證

1. 使用無痕模式訪問系統
2. 登入管理員帳號
3. 編輯用戶並設置權限
4. 保存
5. 重新整理頁面
6. 再次編輯用戶，確認權限保持勾選

---

## 🚨 關鍵教訓

### 1. 後端 SELECT 語句必須包含所有需要的欄位

**問題**: 
- 多個 SELECT 語句缺少 `permissions` 欄位
- 導致前端無法獲取權限數據

**解決方案**:
- 檢查所有 SELECT 語句
- 確保包含 `permissions` 欄位
- 使用 grep 驗證：`grep "SELECT.*FROM users" /app/dist/routes/users.js`

### 2. 前端必須使用後端返回的完整數據

**問題**:
- 前端使用本地數據合併 `{ ...editingUser, ...userData }`
- 如果 `editingUser` 缺少欄位，合併後也會缺少

**解決方案**:
- 使用後端返回的完整用戶對象
- 不要依賴本地數據合併

### 3. API 返回數據結構必須正確處理

**問題**:
- 後端返回 `{user: {...}, message: "..."}`
- 前端期望直接返回用戶對象

**解決方案**:
- 前端 API 函數正確解析返回數據
- 返回 `response.user` 而不是整個 `response`

### 4. Docker 映像管理至關重要

**問題**:
- 修復後直接重啟容器，修改會丟失
- 因為容器使用舊映像

**解決方案**:
- 修復後必須 `docker commit` 創建新映像
- 使用新映像重啟容器
- 這是避免「修A壞B」的關鍵

---

## 📊 修復統計

- **修復時間**: 44 分鐘
- **修復文件**: 2 個（users.js, api.ts, App.tsx）
- **修復的 SELECT 語句**: 3 個
- **創建的 Docker 映像**: 8 個（調試過程）
- **最終穩定映像**: `taskflow-pro:v2.4.1-all-selects-fixed`
- **前端部署**: 2 次
- **最終部署 ID**: `6957034fe61b2dcefbcde3a8`

---

## 🔍 如何診斷類似問題

### 1. 檢查後端 SELECT 語句

```bash
# 檢查所有 SELECT 語句是否包含需要的欄位
ssh root@165.227.147.40 "docker exec taskflow-pro grep 'SELECT.*FROM users' /app/dist/routes/users.js"
```

### 2. 檢查前端 API 返回數據處理

```typescript
// 添加調試日誌
console.log('[DEBUG] API response:', response);
console.log('[DEBUG] User data:', response.user || response);
```

### 3. 檢查資料庫實際值

```bash
# 查看資料庫中的 permissions 值
ssh root@165.227.147.40 "docker exec taskflow-pro node -e \"
const db = require('better-sqlite3')('/app/data/taskflow.db');
const user = db.prepare('SELECT permissions FROM users WHERE id = ?').get('user-id');
console.log(user.permissions);
db.close();
\""
```

### 4. 檢查後端日誌

```bash
# 查看最近的更新請求
ssh root@165.227.147.40 "docker logs taskflow-pro 2>&1 | grep 'UPDATE_USER' | tail -10"
```

---

## ✅ 驗證清單

- [x] 後端 GET /users 包含 permissions 欄位
- [x] 後端 PUT /users/:id 包含 permissions 欄位
- [x] 後端 GET /users/department/:id 包含 permissions 欄位
- [x] 前端 API 正確處理返回數據
- [x] 前端使用後端返回的完整數據
- [x] 創建新 Docker 映像
- [x] 使用新映像重啟容器
- [x] 前端重新構建和部署
- [x] 使用無痕模式測試
- [x] 權限保存成功
- [x] 權限顯示正確
- [x] 重新整理後權限保持

---

## 📦 最終版本

### 後端
- **Docker 映像**: `taskflow-pro:v2.4.1-all-selects-fixed`
- **關鍵修復**: 所有 SELECT 語句包含 permissions 欄位

### 前端
- **部署 ID**: `6957034fe61b2dcefbcde3a8`
- **關鍵修復**: API 正確處理返回數據，使用後端完整數據

### 資料庫
- **備份**: 待執行
- **狀態**: 正常運作

---

## 🎯 預防措施

### 1. 代碼審查清單

- [ ] 所有 SELECT 語句包含所有需要的欄位
- [ ] API 返回數據結構與前端期望一致
- [ ] 前端使用後端返回的數據，不依賴本地合併
- [ ] 修復後創建新 Docker 映像
- [ ] 使用新映像重啟容器

### 2. 測試清單

- [ ] 使用無痕模式測試
- [ ] 保存後重新整理頁面
- [ ] 確認數據持久化
- [ ] 檢查 Console 無錯誤
- [ ] 檢查後端日誌無錯誤

### 3. 部署清單

- [ ] 前端清除 dist 目錄
- [ ] 前端重新構建
- [ ] 前端部署到 Netlify
- [ ] 後端修復文件
- [ ] 後端創建新映像
- [ ] 後端使用新映像重啟
- [ ] 備份資料庫

---

**創建日期**: 2026-01-02 07:37 AM  
**最後更新**: 2026-01-02 07:37 AM  
**狀態**: ✅ 問題已完全解決
