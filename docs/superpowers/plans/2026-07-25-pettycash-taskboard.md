# 零用金月結版 + 任務看板升級 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** FinanceView 加月結記帳能力（月份切換/當月統計/分類小計/CSV 匯出）；任務看板加統計列/篩選器/狀態分組/期限 chip/排序。

**Architecture:** 純前端。零用金＝在既有 `filteredRecords` memo 鏈前插入月份維度＋新增分類小計 memo；任務＝在既有 `displayedTasks` memo 上疊篩選與排序，渲染層加統計列與分組。不動後端。

**Tech Stack:** React 18 + TypeScript + Tailwind（沿用現有樣式 token：rounded-xl、slate/blue）。

## Global Constraints

- 專案無單元測試設施 → 每 Task 驗證＝`npx tsc --noEmit`（不得新增錯誤）＋ Chrome DevTools 實測（Console 無紅字）。
- spec 出處：`docs/superpowers/specs/2026-07-25-pettycash-taskboard-design.md`（驗收條件在 spec 尾）。
- 所有新 async 呼叫必須有 try/catch（盲區類型 O，本專案剛批修過）。
- 金額顯示加 `tabular-nums`；`<button>` 一律寫 `type="button"`（盲區類型 K）。
- Feature A 一個 commit、Feature B 一個 commit（設計已核准）。

---

### Task A: FinanceView 月結版

**Files:**
- Modify: `components/FinanceView.tsx`（state 區 ~29-53、filteredRecords ~78-103、stats ~118-137、PETTY_CASH 渲染區）

**Interfaces (Produces):**
- state: `filterMonth: string | null`（`'2026-07'`；null=全部期間；預設當月）
- state: `filterCategory: string | null`
- memo: `categoryStats: { category: string; total: number; pct: number }[]`（僅 EXPENSE、月份+範圍篩選後、由大到小）
- fn: `exportCsv(): void`（目前篩選結果 → UTF-8 BOM CSV 下載）

- [ ] **A1 月份狀態與篩選**：加 `filterMonth`（預設 `new Date().toISOString().slice(0, 7)`）、`filterCategory`。`filteredRecords` memo 最前面插入：
```ts
if (filterMonth) result = result.filter((r) => (r.date || '').startsWith(filterMonth));
```
（category 篩選插在最尾：`if (filterCategory) result = result.filter((r) => r.category === filterCategory);`）
deps 陣列補上兩個新 state；分頁 reset effect 的 deps 也補上。
- [ ] **A2 月份切換器 UI**：PETTY_CASH 分頁統計卡上方加列：`‹`／`2026年7月`／`›`／`本月`／`全部期間` chip。切換函式：
```ts
const shiftMonth = (delta: number) => {
  const base = filterMonth ?? new Date().toISOString().slice(0, 7);
  const d = new Date(`${base}-01T00:00:00`);
  d.setMonth(d.getMonth() + delta);
  setFilterMonth(d.toISOString().slice(0, 7));
  setFilterCategory(null);
};
```
- [ ] **A3 分類小計**：新 memo 自「月份+範圍篩選、**不含** category 篩選」的紀錄計算 EXPENSE 分類加總與佔比；渲染為列（名稱、金額、CSS 橫條 `style={{width: pct+'%'}}`、%），>5 類收合「更多」。點分類＝toggle `filterCategory`。空月份顯示「這個月沒有紀錄」＋「回到本月」鈕。
- [ ] **A4 CSV 匯出**：
```ts
const exportCsv = () => {
  const rows = [['日期','類型','分類','說明','金額','狀態','部門','記錄人'],
    ...filteredRecords.map((r) => [r.date, r.type === 'INCOME' ? '收入' : '支出', r.category,
      r.description, String(r.amount), r.status, getDeptName(r.departmentId), userName(r)])];
  const csv = rows.map((row) => row.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `零用金_${filterMonth ?? '全部'}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
};
```
- [ ] **A5 驗證**：tsc 無新錯；瀏覽器：切月統計變化正確、分類小計=支出合計、CSV 下載且 Excel 中文正常、空月份空狀態、375px 不破版。
- [ ] **A6 Commit**：`feat(finance): monthly view with month switcher, category subtotals and CSV export`

### Task B: 任務看板升級

**Files:**
- Modify: `components/TaskCard.tsx:119-126, ~436`（期限 chip）
- Modify: `App.tsx`（state 區、`displayedTasks` memo ~1177、tasks 頁渲染 ~1940-2045）

**Interfaces (Produces):**
- state: `taskFilterAssignee/taskFilterDept/taskFilterUrgency: string`（`'ALL'` 預設）、`taskSort: 'deadline' | 'created' | 'urgency'`（預設 `'deadline'`）、`quickFilter: 'in_progress' | 'available' | 'overdue' | null`
- helper（App.tsx 頂層，TaskCard 也可 import 同邏輯）：
```ts
const isTaskOverdue = (t: Task) => !!t.deadline && new Date(t.deadline) < new Date() &&
  t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED;
const taskCompletedAt = (t: Task) =>
  t.status === TaskStatus.COMPLETED && t.timeline?.length ? t.timeline[t.timeline.length - 1].timestamp : null;
```

- [ ] **B1 TaskCard 期限 chip**：改 436 行處的期限顯示——逾期(紅 bg-red-100 text-red-700)「逾期 N 天」、48h 內(橘)「今天/明天到期」、其餘灰短日期、無期限不顯示。沿用既有 `isExpired` 邏輯位置、勿另建平行判斷。
- [ ] **B2 篩選＋排序**：`displayedTasks` memo 尾端（search 之後）疊：assignee（`assignedToUserId===x || acceptedByUserId===x`）、dept（`assignedToDepartment===x || targetDepartment===x`）、urgency 相等比對；排序按 `taskSort`（deadline 近→遠、無期限沉底；created 新→舊；urgency Critical>High>Medium>Low）。UI：搜尋欄下方三個 `<select>` ＋排序 `<select>`＋「清除」。順手移除該 memo 內兩處 debug console.log。
- [ ] **B3 統計列**：memo `taskStats = { inProgress, available, overdue, doneThisWeek }`（自未封存未取消集合計算；doneThisWeek 用 `taskCompletedAt` ≥ 本週一）。渲染 4 chip 於標題下；點擊 toggle `quickFilter`（overdue→只顯示逾期、in_progress→In Progress、available→切 boardTab）。
- [ ] **B4 狀態分組**：`boardTab==='all'` 時將 displayedTasks 分組渲染：進行中→已指派→待接取(Open)→已完成(最近10筆，按 `taskCompletedAt` 排)；每組小標＋數量、桌機 `md:grid-cols-2`；其他 tab 平鋪不變。
- [ ] **B5 驗證**：tsc 無新錯；瀏覽器：chip 數字=清單實數、篩選疊加、逾期紅標、分組數量正確、375px 不破版。
- [ ] **B6 Commit**：`feat(tasks): stats chips, filters, status grouping, deadline chips and sorting`

## Self-Review 紀錄
- spec 覆蓋：A1-A5→spec A1-A5；B1-B5→spec B1-B5 ✅（spec B1「本週完成」的 timeline 近似已寫入 helper）。
- 型別一致：`filterMonth/filterCategory/taskSort/quickFilter` 名稱前後一致 ✅。
- 無 placeholder ✅。
