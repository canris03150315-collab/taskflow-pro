# 工作日誌 - 2026-01-08

## 主要任務

### 1. 用戶刪除功能修復
- **問題**: 刪除用戶時出現 500 錯誤 `FOREIGN KEY constraint failed`
- **原因**: 用戶在其他表中有關聯數據（任務、請假、排班等）
- **解決方案**: 添加級聯刪除邏輯，先刪除相關數據再刪除用戶
- **修復文件**: `/app/dist/routes/users.js`
- **版本**: v8.9.65-user-delete-cascade

### 2. 下屬每日任務執行狀況功能
- **需求**: 主管可以查看每個下屬今日的每日任務完成進度
- **實施內容**:
  1. 創建新組件 `SubordinateRoutineView.tsx`
  2. 在 App.tsx 添加標籤切換（任務狀況 / 每日任務執行狀況）
  3. 添加後端路由 `GET /api/routines/history`
- **版本**: 
  - 前端: Deploy ID `695f1e4e24447aacdb3df05a`
  - 後端: v8.9.67-routines-history-fixed

---

## 詳細修改記錄

### 用戶刪除功能修復

#### 問題診斷
```
SqliteError: FOREIGN KEY constraint failed
```

用戶在以下表中有關聯數據：
- tasks (created_by, assigned_to_user_id, accepted_by_user_id)
- leave_requests (user_id, approver_id)
- schedules (user_id, reviewed_by)
- routine_records (user_id)
- attendance_records (user_id)
- reports (user_id)
- finance (user_id)
- announcements (created_by)
- suggestions (author_id, status_changed_by)

#### 修復方案
在 DELETE 路由中添加級聯刪除：

```javascript
// Delete related data first to avoid foreign key constraints
await db.run('DELETE FROM tasks WHERE created_by = ? OR assigned_to_user_id = ? OR accepted_by_user_id = ?', [id, id, id]);
await db.run('DELETE FROM leave_requests WHERE user_id = ? OR approver_id = ?', [id, id]);
await db.run('DELETE FROM schedules WHERE user_id = ? OR reviewed_by = ?', [id, id]);
await db.run('DELETE FROM routine_records WHERE user_id = ?', [id]);
await db.run('DELETE FROM attendance_records WHERE user_id = ?', [id]);
await db.run('DELETE FROM reports WHERE user_id = ?', [id]);
await db.run('DELETE FROM finance WHERE user_id = ?', [id]);
await db.run('DELETE FROM announcements WHERE created_by = ?', [id]);
await db.run('DELETE FROM suggestions WHERE author_id = ? OR status_changed_by = ?', [id, id]);

// Now delete the user
await db.run('DELETE FROM users WHERE id = ?', [id]);
```

#### 部署步驟
```bash
# 1. 創建修復腳本
Get-Content "fix-user-delete-final.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/fix-delete-final.js"

# 2. 執行修復
ssh root@165.227.147.40 "docker cp /tmp/fix-delete-final.js taskflow-pro:/app/fix-delete-final.js && docker exec -w /app taskflow-pro node fix-delete-final.js"

# 3. 重啟並創建新映像
ssh root@165.227.147.40 "docker restart taskflow-pro"
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v8.9.65-user-delete-cascade"
```

---

### 下屬每日任務執行狀況功能

#### 功能需求
主管需要查看每個下屬今日的每日任務完成進度，包括：
- 完成百分比
- 進度條顯示
- 每個任務項目的完成狀態
- 部門篩選功能

#### 前端實現

##### 1. 創建 SubordinateRoutineView 組件
**文件**: `components/SubordinateRoutineView.tsx`

**功能特點**:
- 顯示所有下屬的每日任務卡片
- 每個卡片包含：用戶信息、完成進度、任務列表
- 進度條顏色根據完成度變化（綠色=100%、藍色≥50%、橙色<50%）
- BOSS 可以選擇部門篩選
- 自動載入今日記錄

**關鍵代碼**:
```typescript
const getUserRoutineStats = (userId: string) => {
  const userRecord = routineRecords.find(r => r.user_id === userId);
  if (!userRecord || !userRecord.items) {
    return { total: 0, completed: 0, percentage: 0, hasRecord: false };
  }

  const total = userRecord.items.length;
  const completed = userRecord.items.filter(item => item.isCompleted).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, percentage, hasRecord: true };
};
```

##### 2. 修改 App.tsx 添加標籤切換
**修改位置**: App.tsx 第 1145-1172 行

添加兩個標籤：
- 📋 任務狀況（原有功能）
- ✓ 每日任務執行狀況（新功能）

```typescript
const [teamViewTab, setTeamViewTab] = useState<'tasks' | 'routines'>('tasks');

{currentPage === 'team' && (
  <div className="space-y-4">
    <div className="flex gap-2 border-b border-slate-200 pb-2">
      <button onClick={() => setTeamViewTab('tasks')}>📋 任務狀況</button>
      <button onClick={() => setTeamViewTab('routines')}>✓ 每日任務執行狀況</button>
    </div>
    {teamViewTab === 'tasks' && <SubordinateView ... />}
    {teamViewTab === 'routines' && <SubordinateRoutineView ... />}
  </div>
)}
```

#### 後端實現

##### 添加 GET /history 路由
**文件**: `/app/dist/routes/routines.js`

**功能**: 獲取用戶最近 30 天的每日任務記錄

```javascript
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;
    const userDept = req.user.department;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    
    const records = dbCall(db, 'prepare', 
      'SELECT * FROM routine_records WHERE user_id = ? AND department_id = ? AND date >= ? ORDER BY date DESC'
    ).all(userId, userDept, startDate);
    
    const mappedRecords = records.map(r => ({
      id: r.id,
      user_id: r.user_id,
      department_id: r.department_id,
      date: r.date,
      items: JSON.parse(r.items || '[]')
    }));
    
    res.json({ records: mappedRecords });
  } catch (error) {
    console.error('Get routine history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

##### 修復過程
1. **第一次添加**: 路由語法錯誤，導致結構不完整
2. **第二次修復**: 移除錯誤代碼，重新正確插入路由
3. **最終版本**: v8.9.67-routines-history-fixed

#### 部署步驟

##### 前端部署
```powershell
Remove-Item -Recurse -Force dist
npm run build
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build
```

##### 後端部署
```bash
# 1. 添加路由
Get-Content "fix-routines-history-final.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/fix-history-final.js"
ssh root@165.227.147.40 "docker cp /tmp/fix-history-final.js taskflow-pro:/app/fix-history-final.js && docker exec -w /app taskflow-pro node fix-history-final.js"

# 2. 重啟並創建新映像
ssh root@165.227.147.40 "docker restart taskflow-pro"
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v8.9.67-routines-history-fixed"
```

---

## 權限管理相關

### 假表管理權限確認
- `APPROVE_LEAVES` 權限同時包含排班審核和請假審核
- BOSS/MANAGER/SUPERVISOR 預設擁有此權限
- 用戶選擇保持現狀，不拆分權限

### 權限設定 UI
- 已確認 `UserModal.tsx` 中包含假表管理權限選項
- 第 151 行: `APPROVE_LEAVES` - 審核假期
- 第 152 行: `MANAGE_LEAVE_RULES` - 設定排假規則

---

## 最終版本

### 後端
- **映像**: taskflow-pro:v8.9.67-routines-history-fixed
- **快照**: taskflow-snapshot-v8.9.67-before-manual-attendance-20260108_031607.tar.gz (214MB)

### 前端
- **Deploy ID**: 695f1e4e24447aacdb3df05a
- **Netlify URL**: https://transcendent-basbousa-6df2d2.netlify.app

---

## 已完成功能

### 用戶管理
- ✅ 刪除用戶功能（級聯刪除）

### 團隊管理
- ✅ 下屬任務狀況查看
- ✅ 下屬每日任務執行狀況查看 ⭐ NEW

### 假表管理
- ✅ 排班管理
- ✅ 請假管理
- ✅ 規則設定
- ✅ 權限管理

---

## 待實施功能

### 出勤管理
- ⏳ 主管手動補登打卡功能（下一步）

---

## 關鍵教訓

1. **級聯刪除**: 刪除有外鍵關聯的記錄前，必須先刪除相關數據
2. **路由語法**: 添加路由時確保語法完整，避免結構錯誤
3. **容器映像管理**: 修改後必須 `docker commit` 創建新映像
4. **測試流程**: 清除瀏覽器緩存後測試，避免緩存干擾

---

**最後更新**: 2026-01-08  
**下一步**: 實施主管手動補登打卡功能
