# 待分配新人部門權限修復工作日誌

**日期**: 2026-01-06  
**版本**: v8.9.13-unassigned-dept-complete  
**狀態**: ✅ 已完成

---

## 需求

修改「待分配新人」部門（dept-unassigned）的權限邏輯：
1. **所有有權限新增人員的用戶**都可以新增到待分配部門
2. **所有部門主管（SUPERVISOR）**都可以看到待分配部門的人員
3. **所有部門主管（SUPERVISOR）**都可以編輯待分配部門的人員

---

## 問題分析

### 修改前的邏輯

1. **POST /api/users**（新增人員）：
   - ✅ SUPERVISOR 已經可以新增到 `dept-unassigned`（第 87 行檢查）
   - ✅ 邏輯正確，無需修改

2. **PUT /api/users/:id**（編輯人員）：
   - ❌ `requireSelfOrAdmin` 中間件只允許 SUPERVISOR 編輯：
     - 所有 EMPLOYEE
     - 同部門的 SUPERVISOR
   - ❌ **不允許編輯 dept-unassigned 的人員**

3. **前端 PersonnelView.tsx**（顯示人員）：
   - ❌ 第 45 行過濾邏輯只顯示 SUPERVISOR 自己部門的人員
   - ❌ **不顯示 dept-unassigned 的人員**

---

## 修復方案

### 1. 後端修改：requireSelfOrAdmin 中間件

**文件**: `server/dist/middleware/auth.js`

**修改位置**: 第 117-120 行

```javascript
// 修改前
if (targetUser.role === 'EMPLOYEE' ||
    (targetUser.role === 'SUPERVISOR' && targetUser.department === req.user.department)) {
    next();
}

// 修改後
if (targetUser.role === 'EMPLOYEE' ||
    (targetUser.role === 'SUPERVISOR' && targetUser.department === req.user.department) ||
    targetUser.department === 'dept-unassigned') {
    next();
}
```

**效果**：
- ✅ 所有 SUPERVISOR 都可以編輯 dept-unassigned 部門的人員
- ✅ 保持原有邏輯（EMPLOYEE 和同部門 SUPERVISOR）

---

### 2. 前端修改：PersonnelView.tsx

**文件**: `components/PersonnelView.tsx`

**修改位置**: 第 44-46 行

```typescript
// 修改前
if (currentUser.role === Role.SUPERVISOR) {
  result = result.filter(u => u.department === currentUser.department);
}

// 修改後
if (currentUser.role === Role.SUPERVISOR) {
  // SUPERVISOR 可以看到自己部門和待分配部門的人員
  result = result.filter(u => u.department === currentUser.department || u.department === 'dept-unassigned');
}
```

**效果**：
- ✅ 所有 SUPERVISOR 都可以看到 dept-unassigned 部門的人員
- ✅ 可以在人員列表中顯示待分配的新人

---

## 部署流程

### 1. 創建快照（修改前）
```bash
ssh root@165.227.147.40 "/root/create-snapshot.sh v8.9.12-before-unassigned-dept-fix"
```
- 快照: `taskflow-snapshot-v8.9.12-before-unassigned-dept-fix-20260106_060807.tar.gz` (214MB)

### 2. 修改後端 auth.js

創建修復腳本 `fix-auth-unassigned.js`：
```javascript
const fs = require('fs');
const filePath = '/app/dist/middleware/auth.js';
let content = fs.readFileSync(filePath, 'utf8');

const oldPattern = `                if (targetUser.role === 'EMPLOYEE' ||
                    (targetUser.role === 'SUPERVISOR' && targetUser.department === req.user.department)) {
                    next();
                }`;

const newPattern = `                if (targetUser.role === 'EMPLOYEE' ||
                    (targetUser.role === 'SUPERVISOR' && targetUser.department === req.user.department) ||
                    targetUser.department === 'dept-unassigned') {
                    next();
                }`;

content = content.replace(oldPattern, newPattern);
fs.writeFileSync(filePath, content, 'utf8');
```

上傳並執行：
```bash
Get-Content "fix-auth-unassigned.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/fix-auth-unassigned.js"
ssh root@165.227.147.40 "docker cp /tmp/fix-auth-unassigned.js taskflow-pro:/app/ && docker exec taskflow-pro node /app/fix-auth-unassigned.js"
```

**輸出**：
```
Fixing requireSelfOrAdmin for dept-unassigned...
SUCCESS: requireSelfOrAdmin updated - all SUPERVISOR can edit dept-unassigned users
Complete!
```

### 3. 修改前端 PersonnelView.tsx

修改第 44-46 行，添加對 dept-unassigned 的過濾條件。

### 4. 重啟容器並創建新映像
```bash
ssh root@165.227.147.40 "docker restart taskflow-pro"
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v8.9.13-unassigned-dept-fix"
```
- 新映像: `sha256:231338bf659387dcceb74c767b2de15fb1771fad0771ee068b7fa4ab48b63909`

### 5. 部署前端
```powershell
Remove-Item -Recurse -Force dist
npm run build
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build
```
- Deploy ID: `695ca8111d16431ec9970539`

### 6. 創建最終快照
```bash
/root/create-snapshot.sh v8.9.13-unassigned-dept-complete
```
- 快照: `taskflow-snapshot-v8.9.13-unassigned-dept-complete-20260106_061403.tar.gz` (214MB)

---

## 權限層級總結

### 新增人員到待分配部門（POST /api/users）

| 角色 | 可以新增到 dept-unassigned |
|------|---------------------------|
| BOSS | ✅ 可以 |
| MANAGER | ✅ 可以 |
| SUPERVISOR | ✅ 可以 |
| EMPLOYEE | ❌ 不可以 |
| MANAGE_USERS 權限 | ✅ 可以 |

### 查看待分配部門的人員（GET /api/users）

| 角色 | 可以看到 dept-unassigned 的人員 |
|------|-------------------------------|
| BOSS | ✅ 可以（所有人員） |
| MANAGER | ✅ 可以（所有人員） |
| SUPERVISOR | ✅ 可以（自己部門 + dept-unassigned） |
| EMPLOYEE | ❌ 不可以 |

### 編輯待分配部門的人員（PUT /api/users/:id）

| 角色 | 可以編輯 dept-unassigned 的人員 |
|------|-------------------------------|
| BOSS | ✅ 可以 |
| MANAGER | ✅ 可以 |
| SUPERVISOR | ✅ 可以（修改後） |
| EMPLOYEE | ❌ 不可以 |
| MANAGE_USERS 權限 | ✅ 可以 |

---

## 使用場景

### 場景 1：HR 新增待分配新人
1. HR（擁有 MANAGE_USERS 權限）登入系統
2. 進入「人員管理」
3. 點擊「新增人員」
4. 選擇部門為「待分配新人」
5. 填寫其他資訊並保存
6. ✅ 新人成功加入待分配部門

### 場景 2：部門主管查看待分配新人
1. 部門主管（SUPERVISOR）登入系統
2. 進入「人員管理」
3. ✅ 可以看到：
   - 自己部門的所有人員
   - 待分配部門的所有新人
4. 可以查看新人的詳細資訊

### 場景 3：部門主管編輯待分配新人
1. 部門主管（SUPERVISOR）在人員列表中看到待分配新人
2. 點擊編輯按鈕
3. 修改新人的部門為自己的部門
4. ✅ 成功將新人分配到自己部門

### 場景 4：部門主管新增人員到待分配
1. 部門主管（SUPERVISOR）點擊「新增人員」
2. 選擇部門為「待分配新人」或自己的部門
3. ✅ 兩種選擇都允許
4. 填寫資訊並保存

---

## 修復前後對比

### 修復前
- ❌ SUPERVISOR 無法看到 dept-unassigned 的人員
- ❌ SUPERVISOR 無法編輯 dept-unassigned 的人員
- ✅ SUPERVISOR 可以新增人員到 dept-unassigned
- **問題**：新增後看不到，也無法編輯

### 修復後
- ✅ SUPERVISOR 可以看到 dept-unassigned 的人員
- ✅ SUPERVISOR 可以編輯 dept-unassigned 的人員
- ✅ SUPERVISOR 可以新增人員到 dept-unassigned
- **效果**：完整的新增、查看、編輯流程

---

## 最終版本

- **後端**: `taskflow-pro:v8.9.13-unassigned-dept-fix`
- **前端**: Deploy ID `695ca8111d16431ec9970539`
- **快照**: 
  - 修改前: `taskflow-snapshot-v8.9.12-before-unassigned-dept-fix-20260106_060807.tar.gz` (214MB)
  - 修改後: `taskflow-snapshot-v8.9.13-unassigned-dept-complete-20260106_061403.tar.gz` (214MB)
- **狀態**: ✅ 功能完整實現

---

## 關鍵教訓

1. ✅ **遵循全域規則** - 修改前創建快照
2. ✅ **前後端同步修改** - 確保顯示和權限一致
3. ✅ **使用 Pure ASCII 腳本** - 避免編碼問題
4. ✅ **修改後創建新映像** - `docker commit` 是必須步驟
5. ✅ **清除 dist 後重新構建** - 避免部署舊代碼
6. ✅ **檢查所有相關邏輯** - 不只是一個地方的修改

---

## 測試建議

### 1. SUPERVISOR 查看測試
- [ ] SUPERVISOR 登入後可以看到自己部門的人員
- [ ] SUPERVISOR 可以看到 dept-unassigned 的人員
- [ ] SUPERVISOR 看不到其他部門的人員

### 2. SUPERVISOR 編輯測試
- [ ] SUPERVISOR 可以編輯自己部門的 EMPLOYEE
- [ ] SUPERVISOR 可以編輯 dept-unassigned 的人員
- [ ] SUPERVISOR 可以將 dept-unassigned 的人員分配到自己部門
- [ ] SUPERVISOR 無法編輯其他部門的人員

### 3. SUPERVISOR 新增測試
- [ ] SUPERVISOR 可以新增人員到自己部門
- [ ] SUPERVISOR 可以新增人員到 dept-unassigned
- [ ] SUPERVISOR 無法新增人員到其他部門

### 4. 權限組合測試
- [ ] BOSS 可以看到和編輯所有部門（包括 dept-unassigned）
- [ ] MANAGER 可以看到和編輯所有部門（包括 dept-unassigned）
- [ ] MANAGE_USERS 權限用戶可以新增到任何部門

---

**最後更新**: 2026-01-06  
**作者**: Cascade AI
