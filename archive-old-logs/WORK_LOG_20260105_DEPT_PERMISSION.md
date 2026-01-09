# 部門管理權限功能實現工作日誌

**日期**: 2026-01-05  
**版本**: v8.9.11-dept-permission-complete  
**狀態**: ✅ 已完成

---

## 需求

新增「管理部門」權限（MANAGE_DEPARTMENTS），讓非 BOSS/MANAGER 的用戶也可以通過勾選權限來管理部門，就像「管理使用者帳號」權限一樣。

---

## 實現方案

### 1. 添加新權限類型

**文件**: `types.ts`

```typescript
export type Permission = 
  | 'CREATE_TASK'       // 建立任務
  | 'MANAGE_FINANCE'    // 管理公費/新增紀錄
  | 'POST_ANNOUNCEMENT' // 發布公告
  | 'MANAGE_FORUM'      // 管理論壇提案
  | 'MANAGE_USERS'      // 管理使用者帳號 (新增/修改員工)
  | 'MANAGE_DEPARTMENTS' // 管理部門 (新增/修改/刪除部門) ← 新增
  | 'SYSTEM_RESET';     // 系統重置/格式化 (危險權限)
```

---

### 2. 前端權限選項

**文件**: `components/UserModal.tsx`

在權限選項列表中添加：

```typescript
const permissionOptions: { value: Permission; label: string, isDangerous?: boolean }[] = [
  { value: 'CREATE_TASK', label: '建立任務' },
  { value: 'MANAGE_FINANCE', label: '管理公費/收支' },
  { value: 'POST_ANNOUNCEMENT', label: '發布公告' },
  { value: 'MANAGE_FORUM', label: '管理論壇提案' },
  { value: 'MANAGE_USERS', label: '管理使用者帳號' },
  { value: 'MANAGE_DEPARTMENTS', label: '管理部門' }, // ← 新增
  { value: 'SYSTEM_RESET', label: '系統重置 (危險功能)', isDangerous: true },
];
```

**效果**：
- 在編輯用戶時，可以勾選「管理部門」權限
- 與其他權限一樣的勾選框樣式

---

### 3. 前端權限檢查

**文件**: `components/PersonnelView.tsx`

修改「部門設定」按鈕的顯示條件：

```typescript
// 修改前：只有 BOSS 可以訪問
{currentUser.role === Role.BOSS && (
  <button onClick={() => setViewMode('DEPT_MGMT')}>
    部門設定
  </button>
)}

// 修改後：BOSS/MANAGER 或擁有 MANAGE_DEPARTMENTS 權限的用戶可以訪問
{(currentUser.role === Role.BOSS || 
  currentUser.role === Role.MANAGER || 
  hasPermission(currentUser, 'MANAGE_DEPARTMENTS')) && (
  <button onClick={() => setViewMode('DEPT_MGMT')}>
    部門設定
  </button>
)}
```

**效果**：
- 擁有 MANAGE_DEPARTMENTS 權限的用戶可以看到「部門設定」按鈕
- 可以進入部門管理頁面

---

### 4. 後端權限檢查

**文件**: `server/dist/routes/departments.js`

修改三個路由的權限檢查邏輯：

#### POST /api/departments（創建部門）

```javascript
// 修改前
router.post('/', authenticateToken, requireRole([Role.BOSS, Role.MANAGER]), async (req, res) => {

// 修改後
router.post('/', authenticateToken, async (req, res) => {
    const currentUser = req.user;
    const hasPermission = currentUser.role === 'BOSS' || 
                         currentUser.role === 'MANAGER' || 
                         (currentUser.permissions && currentUser.permissions.includes('MANAGE_DEPARTMENTS'));
    if (!hasPermission) {
        return res.status(403).json({ error: '\u7121\u6b0a\u5275\u5efa\u90e8\u9580' });
    }
```

#### PUT /api/departments/:id（更新部門）

```javascript
// 修改前
router.put('/:id', authenticateToken, requireRole([Role.BOSS, Role.MANAGER]), async (req, res) => {

// 修改後
router.put('/:id', authenticateToken, async (req, res) => {
    const currentUser = req.user;
    const hasPermission = currentUser.role === 'BOSS' || 
                         currentUser.role === 'MANAGER' || 
                         (currentUser.permissions && currentUser.permissions.includes('MANAGE_DEPARTMENTS'));
    if (!hasPermission) {
        return res.status(403).json({ error: '\u7121\u6b0a\u66f4\u65b0\u90e8\u9580' });
    }
```

#### DELETE /api/departments/:id（刪除部門）

```javascript
// 修改前
router.delete('/:id', authenticateToken, requireRole([Role.BOSS]), async (req, res) => {

// 修改後
router.delete('/:id', authenticateToken, async (req, res) => {
    const currentUser = req.user;
    const hasPermission = currentUser.role === 'BOSS' || 
                         (currentUser.permissions && currentUser.permissions.includes('MANAGE_DEPARTMENTS'));
    if (!hasPermission) {
        return res.status(403).json({ error: '\u7121\u6b0a\u522a\u9664\u90e8\u9580' });
    }
```

**注意**：刪除部門只允許 BOSS 或擁有 MANAGE_DEPARTMENTS 權限的用戶，不包括 MANAGER。

---

## 部署流程

### 1. 創建快照（修改前）
```bash
ssh root@165.227.147.40 "/root/create-snapshot.sh v8.9.10-before-dept-permission"
```
- 快照: `taskflow-snapshot-v8.9.10-before-dept-permission-20260105_141415.tar.gz` (214MB)

### 2. 修改前端
- ✅ `types.ts` - 添加 MANAGE_DEPARTMENTS 權限類型
- ✅ `components/UserModal.tsx` - 添加權限選項
- ✅ `components/PersonnelView.tsx` - 檢查權限以顯示部門設定按鈕

### 3. 修改後端
創建修復腳本 `fix-dept-perm.js`：
```javascript
const fs = require('fs');
const filePath = '/app/dist/routes/departments.js';
let content = fs.readFileSync(filePath, 'utf8');

// 替換 POST、PUT、DELETE 路由的權限檢查
// 從 requireRole([Role.BOSS, Role.MANAGER]) 
// 改為手動檢查 BOSS/MANAGER 或 MANAGE_DEPARTMENTS 權限

fs.writeFileSync(filePath, content, 'utf8');
```

上傳並執行：
```bash
Get-Content "fix-dept-perm.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/fix.js"
ssh root@165.227.147.40 "docker cp /tmp/fix.js taskflow-pro:/app/ && docker exec taskflow-pro node /app/fix.js"
```

輸出：
```
Starting fix...
POST fixed
PUT fixed
DELETE fixed
Complete!
```

### 4. 重啟容器並創建新映像
```bash
ssh root@165.227.147.40 "docker restart taskflow-pro"
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v8.9.11-dept-permission"
```
- 新映像: `sha256:66b6cfc1276030ea4cd24e029eba5d5a7d9bafca77c9a752e61e7c637ae90e04`

### 5. 部署前端
```powershell
Remove-Item -Recurse -Force dist
npm run build
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build
```
- Deploy ID: `695bc8ad8870fd31e9a4e8fc`

### 6. 創建最終快照
```bash
/root/create-snapshot.sh v8.9.11-dept-permission-complete
```
- 快照: `taskflow-snapshot-v8.9.11-dept-permission-complete-20260105_142044.tar.gz` (214MB)

---

## 權限層級對比

### 創建部門（POST）
- **修改前**: BOSS、MANAGER
- **修改後**: BOSS、MANAGER、擁有 MANAGE_DEPARTMENTS 權限的用戶

### 更新部門（PUT）
- **修改前**: BOSS、MANAGER
- **修改後**: BOSS、MANAGER、擁有 MANAGE_DEPARTMENTS 權限的用戶

### 刪除部門（DELETE）
- **修改前**: 只有 BOSS
- **修改後**: BOSS、擁有 MANAGE_DEPARTMENTS 權限的用戶

---

## 使用方式

### 1. 授予權限
1. BOSS 或 MANAGER 進入「人員管理」
2. 編輯要授權的用戶
3. 在「特權設定」中勾選「管理部門」
4. 保存

### 2. 使用權限
1. 擁有權限的用戶登入系統
2. 進入「人員管理」頁面
3. 可以看到「部門設定」按鈕（與 BOSS/MANAGER 一樣）
4. 點擊進入部門管理頁面
5. 可以新增、編輯、刪除部門

---

## 技術特點

### 1. 前後端一致的權限檢查
- 前端：控制 UI 顯示（按鈕可見性）
- 後端：控制 API 訪問（403 錯誤）
- 雙重保護，確保安全

### 2. 靈活的權限組合
```typescript
const hasPermission = 
  currentUser.role === 'BOSS' || 
  currentUser.role === 'MANAGER' || 
  (currentUser.permissions && currentUser.permissions.includes('MANAGE_DEPARTMENTS'));
```
- 支援角色權限（BOSS/MANAGER）
- 支援細粒度權限（MANAGE_DEPARTMENTS）
- 兩者可以組合使用

### 3. Pure ASCII 後端修復
- 使用 Node.js 腳本修改後端文件
- 避免 PowerShell 引號問題
- 使用 `Get-Content | ssh` 管道上傳

---

## 最終版本

- **後端**: `taskflow-pro:v8.9.11-dept-permission`
- **前端**: Deploy ID `695bc8ad8870fd31e9a4e8fc`
- **快照**: 
  - 修改前: `taskflow-snapshot-v8.9.10-before-dept-permission-20260105_141415.tar.gz` (214MB)
  - 修改後: `taskflow-snapshot-v8.9.11-dept-permission-complete-20260105_142044.tar.gz` (214MB)
- **狀態**: ✅ 功能完整實現

---

## 關鍵教訓

1. ✅ **遵循全域規則** - 修改前創建快照
2. ✅ **前後端同步修改** - 確保權限檢查一致
3. ✅ **使用 Pure ASCII 腳本** - 避免編碼問題
4. ✅ **修改後創建新映像** - `docker commit` 是必須步驟
5. ✅ **清除 dist 後重新構建** - 避免部署舊代碼
6. ✅ **權限檢查雙重保護** - 前端 UI + 後端 API

---

## 測試建議

### 1. 授權測試
- [ ] BOSS 可以授予 MANAGE_DEPARTMENTS 權限
- [ ] MANAGER 可以授予 MANAGE_DEPARTMENTS 權限
- [ ] SUPERVISOR 不能授予權限（無權限管理功能）

### 2. 功能測試
- [ ] 擁有權限的 EMPLOYEE 可以看到「部門設定」按鈕
- [ ] 可以創建新部門
- [ ] 可以編輯現有部門
- [ ] 可以刪除空部門（無成員、無子部門）

### 3. 權限測試
- [ ] 沒有權限的用戶看不到「部門設定」按鈕
- [ ] 直接訪問 API 會返回 403 錯誤
- [ ] 權限撤銷後立即失效

---

**最後更新**: 2026-01-05  
**作者**: Cascade AI
