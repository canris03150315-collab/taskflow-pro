# 工作日誌 2026-01-08

## 今日修復項目

### 1. 任務刪除功能修復

#### 問題描述
修復任務刪除功能後導致登入失敗（500 Internal Server Error on auth setup check）

#### 根本原因
後端 `tasks.js` 中 `exports.taskRoutes = router` 放在文件**中間**，導致後面定義的路由（GET、POST、PUT、PATCH）沒有被註冊到 router。

#### 解決方案
1. **立即回滾**到穩定版本 `v8.9.75-manual-attendance-update`
2. 用正確的方式修復：將 `exports.taskRoutes = router` 移到文件**末尾**

#### 修復腳本
```javascript
// fix-delete-task-order.js
const fs = require('fs');
const filePath = '/app/dist/routes/tasks.js';
let content = fs.readFileSync(filePath, 'utf8');

const exportsLine = "exports.taskRoutes = router;";
const exportsIndex = content.indexOf(exportsLine);

if (exportsIndex !== -1) {
  const afterExports = content.substring(exportsIndex + exportsLine.length);
  if (afterExports.includes('router.get') || afterExports.includes('router.post')) {
    // Remove the early exports line
    content = content.replace(exportsLine + '\n', '');
    // Add exports at the very end
    content = content.trimEnd() + '\n\nexports.taskRoutes = router;\n';
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Moved exports to end of file');
  }
}
```

#### 關鍵教訓
- **exports 位置很重要**：必須在所有路由定義之後
- **回滾優先**：遇到登入失敗等嚴重問題，先回滾再修復
- **最小化修改**：不要修改 import，只修改必要的部分

---

### 2. 員工無法看到刪除任務按鈕

#### 問題描述
員工「洲lujuju888」反映看不到任務的垃圾桶刪除圖標

#### 根本原因
前端 `TaskCard.tsx` 中 `canDelete` 條件限制：
```typescript
// 舊邏輯：只有 OPEN 或 ASSIGNED 狀態才能刪除
const canDelete = 
    (task.createdBy === currentUser.id || ...) &&
    (task.status === TaskStatus.OPEN || task.status === TaskStatus.ASSIGNED);
```

該任務狀態是「進行中」，所以不符合條件。

#### 解決方案
移除狀態限制，讓任務創建者和管理者可以刪除任何狀態的任務：
```typescript
// 新邏輯：創建者、BOSS、MANAGER 可刪除任何狀態的任務
const canDelete = 
    task.createdBy === currentUser.id || 
    currentUser.role === Role.BOSS || 
    currentUser.role === Role.MANAGER;
```

---

### 3. 刪除打卡記錄功能

#### 需求描述
用戶希望可以刪除因快速打卡造成的 0 工時記錄

#### 實現內容

**後端 - DELETE /api/attendance/:id**
```javascript
router.delete('/:id', authenticateToken, async (req, res) => {
  // 權限：BOSS、MANAGER、SUPERVISOR 可刪除
  // SUPERVISOR 只能刪除同部門的記錄
  if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER' && currentUser.role !== 'SUPERVISOR') {
    return res.status(403).json({ error: '權限不足' });
  }
  
  // SUPERVISOR 部門檢查
  if (currentUser.role === 'SUPERVISOR') {
    const targetUser = await dbCall(db, 'get', 'SELECT * FROM users WHERE id = ?', [existing.user_id]);
    if (targetUser && targetUser.department !== currentUser.department) {
      return res.status(403).json({ error: '只能刪除同部門的記錄' });
    }
  }
  
  await dbCall(db, 'run', 'DELETE FROM attendance_records WHERE id = ?', [id]);
  res.json({ success: true, message: '打卡記錄已刪除' });
});
```

**前端 - api.ts**
```typescript
delete: async (id: string): Promise<void> => {
    await request<{ success: boolean }>('DELETE', `/attendance/${id}`);
},
```

**前端 - DepartmentDataView.tsx**
- 添加 `handleDeleteAttendance` 處理函數
- 在每筆打卡記錄旁添加紅色「刪除」按鈕
- 點擊後彈出確認對話框

---

### 4. 清理因回滾而出現的舊部門

#### 問題描述
回滾到 v8.9.75 後，之前刪除的部門（技術工程部、市場行銷部、人力資源部）又出現了

#### 原因
回滾使用的映像包含舊的數據庫快照

#### 解決方案
```javascript
// delete-old-depts.js
const db = require('./node_modules/better-sqlite3')('/app/data/taskflow.db');
const oldDepts = ['Engineering', 'Marketing', 'HR'];

for (const id of oldDepts) {
  const users = db.prepare('SELECT COUNT(*) as count FROM users WHERE department = ?').get(id);
  if (users.count === 0) {
    db.prepare('DELETE FROM departments WHERE id = ?').run(id);
    console.log('DELETED:', id);
  }
}
db.close();
```

---

## 版本記錄

| 版本 | 描述 | 時間 |
|-----|------|------|
| v8.9.75 | 回滾基準版本 | 12:57 |
| v8.9.77 | 修復任務刪除（exports 位置） | 13:00 |
| v8.9.78 | 添加刪除打卡記錄功能 | 13:10 |
| v8.9.79 | 清理舊部門數據 | 13:20 |

## 前端部署記錄

| Deploy ID | 描述 |
|-----------|------|
| 695f39890c85640c66a7ace9 | 修復任務刪除按鈕顯示 |
| 695f3baef76af113fabe7cee | 添加打卡記錄刪除按鈕 |

---

## 關鍵教訓總結

1. **exports 位置**：Express 路由的 `exports` 必須在所有 `router.xxx` 定義之後
2. **回滾優先**：遇到嚴重問題先回滾，再用安全的方式修復
3. **權限設計**：刪除功能的權限應該基於角色和關係，不要過度限制狀態
4. **數據一致性**：回滾會恢復舊數據，需要手動清理不需要的數據

---

**最終版本**: taskflow-pro:v8.9.79-cleanup-old-depts
**前端部署**: 695f3baef76af113fabe7cee
**狀態**: ✅ 所有功能正常
