# 工作日誌 - 封存任務顯示修復

**日期**: 2026-01-02  
**版本**: v8.4.0-archive-display-complete  
**狀態**: ✅ 已完成

---

## 📋 問題描述

1. 封存任務後，重新整理會恢復成未封存狀態
2. 封存的任務不會在「已封存」標籤頁出現

---

## 🔍 診斷過程（使用 Console 調試）

### 問題 1：封存狀態不持久

**Console 輸出**：
```
PATCH /api/tasks/:id 404 (Not Found)
```

**診斷**：
- 前端使用 PATCH 請求
- 後端沒有 PATCH 路由
- 修改前端改用 PUT 路由

**修復後仍有問題**：
- 封存成功，但重新整理後恢復

**進一步診斷**：
- 後端 PUT 路由參數解構中**缺少 `is_archived`**
- 前端傳送了 `is_archived: true`，但後端忽略了

### 問題 2：封存任務不顯示

**Console 輸出**：
```
[App] displayedTasks 計算: {
  boardTab: "archived",
  totalTasks: 0,  // ❌ 應該有任務
  tasksWithArchiveStatus: Array(0)
}
```

**診斷步驟**：
1. 添加 API 層 console 調試
2. 發現前端沒有收到任何任務數據
3. 檢查資料庫：有 1 個任務，`is_archived = 1`
4. 檢查後端路由：預設過濾掉封存任務

**根本原因**：
```javascript
// 後端預設行為
const { is_archived = 'false', ... } = req.query;
query += ' AND t.is_archived = ?';
params.push(is_archived === 'true' ? 1 : 0);
```

---

## 🔧 完整修復方案

### 1. 前端：封存任務改用 PUT 路由

**文件**: `App.tsx`

**修改前**：
```typescript
const handleArchiveTask = async (taskId: string) => {
    await api.tasks.updateProgress(taskId, { isArchived: true });  // PATCH
}
```

**修改後**：
```typescript
const handleArchiveTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const updatedTask = { ...task, isArchived: true, is_archived: true };
    await api.tasks.update(updatedTask);  // PUT
}
```

### 2. 後端：PUT 路由處理 is_archived

**文件**: `/app/dist/routes/tasks.js`

**修改前**：
```javascript
const { title, description, urgency, deadline, assigned_to_user_id, 
        assigned_to_department, status, progress, is_offline, note } = req.body;
// 缺少 is_archived
```

**修改後**：
```javascript
const { title, description, urgency, deadline, assigned_to_user_id, 
        assigned_to_department, status, progress, is_offline, note, 
        is_archived } = req.body;

// 添加處理邏輯
if (is_archived !== undefined) {
    updates.push('is_archived = ?');
    params.push(is_archived ? 1 : 0);
}
```

### 3. 前端：同時獲取所有任務

**文件**: `services/api.ts`

**修改前**：
```typescript
getAll: async (): Promise<Task[]> => {
    const response = await request('GET', '/tasks');
    // 只獲取未封存的任務
}
```

**修改後**：
```typescript
getAll: async (): Promise<Task[]> => {
    // 同時獲取未封存和已封存的任務
    const [normalResponse, archivedResponse] = await Promise.all([
        request('GET', '/tasks?is_archived=false'),
        request('GET', '/tasks?is_archived=true')
    ]);
    
    const allTasks = [...normalResponse.tasks, ...archivedResponse.tasks];
    // 前端自己篩選顯示
}
```

---

## 📊 修復歷程

| 版本 | 修復內容 | 狀態 |
|------|----------|------|
| v8.3.2 | PUT 路由處理 is_archived | ✅ |
| v8.4.0 | 前端同時獲取所有任務 | ✅ |

---

## 🎯 關鍵教訓

### 1. Console 調試的價值（再次驗證）

**問題**：封存任務不顯示，不知道是前端還是後端問題。

**解決方案**：
1. 添加 App 層 console：發現 `totalTasks: 0`
2. 添加 API 層 console：發現沒有收到任務數據
3. 檢查資料庫：發現任務存在但已封存
4. 檢查後端路由：發現預設過濾封存任務

**效果**：從「不知道問題在哪」到「精確定位根本原因」只需 10 分鐘。

### 2. 後端預設行為的影響

**問題**：後端為了性能，預設過濾掉封存任務。

**影響**：
- 前端無法獲取封存任務
- 「已封存」標籤頁永遠是空的

**解決方案**：
- 前端明確指定 `is_archived=true` 參數
- 或前端同時獲取兩種狀態的任務

### 3. 參數完整性檢查

**問題**：後端 PUT 路由缺少 `is_archived` 參數。

**教訓**：
- 添加新功能時，檢查所有相關路由的參數
- 確保前後端參數一致

---

## 📦 版本資訊

### 後端
- **版本**: v8.4.0-archive-display-complete
- **快照**: taskflow-snapshot-v8.4.0-archive-display-complete-*.tar.gz
- **修復內容**:
  - ✅ PUT 路由處理 is_archived 欄位

### 前端
- **部署 ID**: 6957e28d90683de68cc8a1e9
- **URL**: https://transcendent-basbousa-6df2d2.netlify.app
- **修復內容**:
  - ✅ 封存任務使用 PUT 路由
  - ✅ 同時獲取未封存和已封存的任務
  - ✅ 前端自己篩選顯示

---

## ✅ 驗證結果

### 功能測試
- ✅ 可以封存任務
- ✅ 封存狀態持久化（重新整理不會恢復）
- ✅ 「已封存」標籤頁正確顯示封存任務
- ✅ Timeline 正確顯示
- ✅ 所有備註正確保存和顯示

### Console 輸出
```javascript
[API] getAll 原始後端數據: {
  normalTasksLength: 0,
  archivedTasksLength: 1,
  totalTasks: 1
}

[App] displayedTasks 計算: {
  boardTab: "archived",
  totalTasks: 1,
  tasksWithArchiveStatus: [{ isArchived: true, ... }]
}

[App] 封存頁篩選結果: {
  filteredCount: 1,
  filtered: [...]
}
```

---

## 📝 後續建議

1. **移除 Console 調試**：功能穩定後，移除生產環境的 console.log
2. **後端優化**：考慮添加 `include_archived=all` 參數，一次獲取所有任務
3. **性能優化**：如果任務數量很大，考慮分頁加載

---

**創建日期**: 2026-01-02  
**最後更新**: 2026-01-02  
**狀態**: ✅ 已完成並驗證
