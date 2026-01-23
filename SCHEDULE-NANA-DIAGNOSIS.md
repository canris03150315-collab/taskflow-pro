# 假表月曆 NANA 不顯示問題 - 診斷報告

**日期**：2026-01-22  
**版本**：v8.9.169-audit-db-syntax-fix  
**診斷方案**：方案 1（只檢查前端顯示邏輯）

---

## 📊 問題描述

63 部門的 NANA 在假表月曆中不顯示排班記錄。

---

## ✅ 資料庫診斷結果

### NANA 用戶信息
- **用戶 ID**：`user-1767673773732-zpw1yqxhs`
- **用戶名**：NANA
- **部門 ID**：`j06ng7vy3`（對應 63部門）
- **角色**：EMPLOYEE

### 排班記錄
NANA 有 **2 筆** 2026 年 1 月的排班記錄：

**記錄 1**（REJECTED）：
- `schedule-1767954240601-l01g5nmy0`
- 月份：2026 年 1 月
- 狀態：REJECTED
- 日期：`[10,11,17,24,31]`

**記錄 2**（APPROVED）✅：
- `schedule-1768010547705-g991490sv`
- 月份：2026 年 1 月
- 狀態：**APPROVED**
- 日期：`[11,17,24,25,31]`（共 5 天）
- 審核者：`user-1767450774219-nx6c02h6b`

### 資料庫表結構
```sql
schedules 表欄位：
- id (TEXT)
- user_id (TEXT)
- department_id (TEXT)
- year (INTEGER)
- month (INTEGER)
- selected_days (TEXT) -- JSON 格式：[11,17,24,25,31]
- total_days (INTEGER)
- status (TEXT)
- submitted_at (TEXT)
- reviewed_by (TEXT)
- reviewed_at (TEXT)
- review_notes (TEXT)
- created_at (TEXT)
- updated_at (TEXT)
```

**結論**：✅ 資料庫中的資料完整且正確

---

## 🔍 後端 API 檢查

### schedules.js 路由
路由：`GET /api/schedules`

**查詢邏輯**（針對 EMPLOYEE）：
```javascript
schedules = await db.all(
  "SELECT * FROM schedules WHERE user_id = ? OR (department_id = ? AND status = 'APPROVED') ORDER BY year DESC, month DESC, submitted_at DESC",
  [currentUser.id, currentUser.department]
);
```

**分析**：
- EMPLOYEE 可以查詢：
  1. 自己的所有排班記錄（`user_id = ?`）
  2. 自己部門內所有 APPROVED 的記錄（`department_id = ? AND status = 'APPROVED'`）
- NANA 應該可以看到自己的 APPROVED 記錄

**結論**：✅ 後端 API 邏輯正確

---

## 💻 前端代碼檢查

### LeaveManagementView.tsx

#### 1. 資料載入
```typescript
const loadSchedules = async () => {
  setLoading(true);
  try {
    const data = await api.schedules.getAll();
    setSchedules(data);
  } catch (error: any) {
    console.error('載入排班失敗:', error);
    toast.error('載入排班失敗');
  } finally {
    setLoading(false);
  }
};
```

#### 2. 篩選邏輯（關鍵）
```typescript
const getApprovedSchedules = () => {
  return schedules.filter(s => 
    s.status === 'APPROVED' && 
    s.year === selectedMonth.year && 
    s.month === selectedMonth.month &&
    (canApprove ? s.department_id === selectedDepartment : s.user_id === currentUser.id)
  );
};
```

**篩選條件**：
1. ✅ `s.status === 'APPROVED'`（NANA 有 APPROVED 記錄）
2. ✅ `s.year === selectedMonth.year`（2026）
3. ✅ `s.month === selectedMonth.month`（1）
4. ⚠️ **關鍵**：
   - 如果 `canApprove` 為 true（BOSS/MANAGER/SUPERVISOR）：比較 `department_id`
   - 如果 `canApprove` 為 false（EMPLOYEE）：比較 `user_id`

#### 3. 顯示邏輯
```typescript
const getUsersOffDuty = (day: number) => {
  const approvedSchedules = getApprovedSchedules();
  const deptUsers = users.filter(u => u.department === selectedDepartment);
  
  return deptUsers.filter(user => {
    const userSchedule = approvedSchedules.find(s => s.user_id === user.id);
    if (userSchedule) {
      const offDays = JSON.parse(userSchedule.selected_days || '[]');
      if (offDays.includes(day)) return true; // 在排班休息日
    }
    // ...
  });
};
```

---

## 🎯 潛在問題分析

### 問題 1：前端 API 調用可能失敗
- 如果 `api.schedules.getAll()` 失敗或返回空陣列
- 則 `schedules` 狀態為空
- 導致 `getApprovedSchedules()` 返回空陣列

### 問題 2：部門篩選器初始化
- `selectedDepartment` 初始值：`currentUser.department`
- 如果當前用戶不是 63 部門，則可能看不到 NANA

### 問題 3：權限判斷
- `canApprove` 的值決定了篩選邏輯
- EMPLOYEE 只能看到自己的記錄（`s.user_id === currentUser.id`）
- 但應該也能看到部門內所有 APPROVED 記錄（根據後端 API）

**矛盾點**：
- 後端 API 返回：自己的 + 部門內 APPROVED
- 前端篩選：只保留自己的（EMPLOYEE 情況下）
- **這裡可能有邏輯不一致**

---

## 🔧 建議的檢查步驟

### 步驟 1：確認前端是否正確載入資料
使用瀏覽器開發者工具：
1. 打開 Network 標籤
2. 查看 `/api/schedules` 請求
3. 確認返回的資料中是否包含 NANA 的記錄

### 步驟 2：檢查前端篩選邏輯
1. 檢查 `selectedMonth` 的值（應該是 `{year: 2026, month: 1}`）
2. 檢查 `selectedDepartment` 的值（應該是 `j06ng7vy3`）
3. 檢查 `canApprove` 的值

### 步驟 3：確認當前用戶角色
- 如果是 EMPLOYEE，需要確認是否在 63 部門
- 如果是 BOSS/MANAGER，需要確認是否選擇了 63 部門

---

## 💡 可能的修復方案

### 方案 A：前端篩選邏輯修正
如果問題在於 `getApprovedSchedules()` 的 EMPLOYEE 邏輯過於嚴格：

**當前邏輯**（EMPLOYEE）：
```typescript
s.user_id === currentUser.id
```

**建議邏輯**（與後端一致）：
```typescript
s.user_id === currentUser.id || (s.department_id === currentUser.department && s.status === 'APPROVED')
```

### 方案 B：確認前端 Deploy ID
- 當前生產環境：`6971315ed8b93fb0c72c6606`
- 需要確認這個版本是否包含最新的修復

---

## 📝 下一步

**等待用戶確認**：
1. 當前是以什麼角色（BOSS/EMPLOYEE）查看？
2. 是否選擇了 63 部門？
3. 需要我創建前端日誌診斷腳本嗎？
4. 或者直接修復前端篩選邏輯？
