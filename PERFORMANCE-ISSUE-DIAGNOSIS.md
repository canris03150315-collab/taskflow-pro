# 載入速度變慢問題 - 診斷報告

**診斷日期**: 2026-01-22 19:30  
**問題**: 前端載入速度明顯變慢  
**影響範圍**: 假表月曆（LeaveManagementView）

---

## 🔍 診斷結果

### 根本原因：月曆渲染中的重複計算

**問題位置**: `components/LeaveManagementView.tsx:844-848`

```typescript
for (let day = 1; day <= daysInMonth; day++) {
    const onDuty = getUsersOnDuty(day);      // 每天調用一次
    const offDuty = getUsersOffDuty(day);    // 每天調用一次
    // ...
}
```

**計算次數**：
- 月曆有 31 天
- 每天調用 2 次（onDuty + offDuty）= **62 次調用**
- 每次調用都會：
  1. 重新過濾所有 schedules（`getApprovedSchedules()`）
  2. 重新過濾所有 users（`users.filter(u => u.department === selectedDepartment)`）
  3. 遍歷所有用戶檢查排班和請假

**計算複雜度**：O(Days × Users × Schedules)
- 假設 31 天、10 個用戶、20 筆排班
- 總計算量：31 × 2 × 10 × 20 = **12,400 次操作**

### 額外問題：重複過濾

在每天的渲染中（867行），又重複過濾了一次：
```typescript
const deptUsers = users.filter(u => u.department === selectedDepartment);
```

這導致部門用戶被過濾了 **62 + 31 = 93 次**。

---

## 📊 效能數據

### 前端 Bundle 大小（正常）
- 總大小：5.01 MB（49 個文件）
- 最大文件：
  - `xlsx-DfDjAMCE.js`: 409 KB
  - `index-Bhi1MoGu.js`: 306 KB
  - `LeaveManagementView-BRCfN5DG.js`: 40.54 KB（正常大小）

**結論**：Bundle 大小正常，不是主要問題。

### 真正的問題：運行時效能

剛才的修復（改用徽章顯示）增加了 DOM 元素數量：
- **修復前**：每天 1 個文字節點
- **修復後**：每天 N 個徽章（N = 休息人數 + 上班人數）

如果 63 部門有 10 個用戶：
- 31 天 × 10 個徽章 = **310 個額外 DOM 元素**

---

## 🎯 解決方案

### 方案 A：使用 useMemo 緩存計算結果（推薦）✅

**優化 1：緩存過濾結果**
```typescript
const approvedSchedules = useMemo(() => {
  return getApprovedSchedules();
}, [schedules, selectedMonth, selectedDepartment, canApprove]);

const deptUsers = useMemo(() => {
  return users.filter(u => u.department === selectedDepartment);
}, [users, selectedDepartment]);
```

**優化 2：緩存每天的計算結果**
```typescript
const dailyStats = useMemo(() => {
  const stats = {};
  for (let day = 1; day <= daysInMonth; day++) {
    stats[day] = {
      onDuty: getUsersOnDuty(day),
      offDuty: getUsersOffDuty(day)
    };
  }
  return stats;
}, [approvedSchedules, deptUsers, selectedMonth, leaves]);
```

**預期效果**：
- 計算次數從 **12,400 次** 降低到 **620 次**（減少 95%）
- 只在 schedules/users/selectedMonth 變化時重新計算

---

### 方案 B：虛擬化渲染（進階）

只渲染可見的日期，適合大型月曆。

---

### 方案 C：回滾徽章顯示（不推薦）

回到 truncate 方式，但會讓 NANA 又不顯示。

---

## 📝 修復步驟（方案 A）

### 1. 修改 LeaveManagementView.tsx

**添加 useMemo**：
```typescript
// 緩存過濾結果
const approvedSchedules = useMemo(() => {
  return getApprovedSchedules();
}, [schedules, selectedMonth.year, selectedMonth.month, selectedDepartment, canApprove, currentUser.id, currentUser.department]);

const deptUsers = useMemo(() => {
  return users.filter(u => u.department === selectedDepartment);
}, [users, selectedDepartment]);

// 緩存每天的上下班人員
const dailyStats = useMemo(() => {
  const stats: Record<number, { onDuty: User[]; offDuty: User[] }> = {};
  const daysInMonth = getDaysInMonth(selectedMonth.year, selectedMonth.month);
  
  for (let day = 1; day <= daysInMonth; day++) {
    stats[day] = {
      onDuty: getUsersOnDuty(day),
      offDuty: getUsersOffDuty(day)
    };
  }
  return stats;
}, [approvedSchedules, deptUsers, selectedMonth, leaves]);
```

**修改月曆渲染**：
```typescript
// 改用緩存的結果
const onDuty = dailyStats[day]?.onDuty || [];
const offDuty = dailyStats[day]?.offDuty || [];
```

### 2. 部署

```powershell
# 1. Git commit
git add components/LeaveManagementView.tsx
git commit -m "perf: 優化月曆渲染效能，使用 useMemo 緩存計算"

# 2. 構建
Remove-Item -Recurse -Force dist
npm run build

# 3. 部署
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build
```

---

## 📊 預期效果

**修復前**：
- 首次載入：3-5 秒
- 切換月份：1-2 秒
- 感覺卡頓

**修復後**：
- 首次載入：< 1 秒
- 切換月份：即時（< 100ms）
- 流暢

---

## ⚠️ 注意事項

1. **保持徽章顯示**：不回滾，NANA 仍正常顯示
2. **只優化計算**：UI 不變，用戶體驗一致
3. **依賴正確**：useMemo 依賴項必須完整

---

## 🎯 建議

採用 **方案 A**（useMemo 優化），原因：
- ✅ 簡單有效
- ✅ 保持功能完整
- ✅ 不影響 UI
- ✅ 效能提升明顯（95%）

---

**診斷完成，等待用戶確認後執行修復。**
