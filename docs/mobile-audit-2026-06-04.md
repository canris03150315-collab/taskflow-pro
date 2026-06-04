# TaskFlow Pro Mobile Audit — 2026-06-04

**Scope:** 全 66 個 active components + App.tsx + index.html + index.css
**Standard:** ui-ux-pro-max §2 Touch & Interaction (CRITICAL) + §5 Layout & Responsive (HIGH) + §6 Typography (MEDIUM)
**Target device:** ≤375px viewport（iPhone SE / 13 mini）+ notched safe-area + 觸控（無 hover）
**Method:** 3 個 parallel Explore agents 掃描

---

## 摘要

| 嚴重度 | 數量 | 描述 |
|--------|------|------|
| 🔴 CRITICAL | ~25 | 手機上完全壞掉或不可達 |
| 🟡 HIGH | ~20 | 不爽用但勉強能用 |
| 🟢 MEDIUM | ~10 | polish |

**最大 systemic 問題（一個 pattern 散在 18+ 檔）：`opacity-0 group-hover:opacity-100`**
這在 `files/ImageUploader.tsx`、`TaskCard.tsx`（剛上線）、`UserModal.tsx`、`SetupPage.tsx` 等 18 處 → 員工在手機上**完全看不到**這些「刪除 / 編輯 / 上傳」按鈕。

---

## 🔴 CRITICAL（手機壞掉）

### C1. App 殼層：viewport blocking zoom + 無 safe-area

**問題：**
- `index.html` viewport meta 含 `maximum-scale=1.0, user-scalable=no` → 無法縮放，違反 ui-ux skill §1 `dynamic-type` / §5 `viewport-meta`
- `App.tsx:1743` 主容器 `pb-20` 沒 `pb-safe` → notch 機器底部會吃掉內容
- `FloatingChatButton.tsx:17`、`FloatingChatList.tsx:92`、`MiniChatWindow.tsx:107/136` 全部 `fixed bottom-6` 無 `env(safe-area-inset-bottom)` → iPhone X+ home indicator 重疊

**修法：**
```html
<!-- index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```
```css
/* index.css 加 utility（或用 tailwind safe-area plugin） */
.pb-safe { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
.bottom-safe-6 { bottom: max(1.5rem, env(safe-area-inset-bottom)); }
```
然後把所有 `fixed bottom-6` 改 `fixed bottom-safe-6`。

### C2. `opacity-0 group-hover:opacity-100` pattern（18 處、最廣）

手機上 hover 不存在 → 這些按鈕永遠不可見。

| File:Line | 動作 |
|-----------|------|
| files/ImageUploader.tsx | X 移除圖片（連帶污染了 TaskCard、WorkLogTab） |
| TaskCard.tsx:602 | 進度歷程的圖片刪除 X |
| AIAssistantView.tsx:476, 498 | 刪 AI 訊息 |
| BulletinView.tsx:217 | 公告操作 |
| ChatSystem.tsx:494 | 刪頻道 |
| CreateAnnouncementModal.tsx | 移除附件 |
| DepartmentManager.tsx:193 | 編輯/刪除部門 |
| FinanceView.tsx | row 操作 |
| PersonnelView.tsx:99, 345 | 編輯/刪除員工 |
| SetupPage.tsx:60 | 換頭像 overlay |
| SubordinateView.tsx | (2×) 編輯/刪除 |
| UserModal.tsx:225 | 換頭像 overlay |

**修法（一次改、全專案受惠）：**
```diff
- className="... opacity-0 group-hover:opacity-100 ..."
+ className="... opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 ..."
```
邏輯：**手機 ≤640px 永遠可見**、桌面才保留 hover-to-reveal。或更保守 → 永遠 100% 可見、不分裝置。

### C3. Touch target < 44×44pt

| File:Line | 元素 | 實際大小 |
|-----------|------|---------|
| KOLManagementView.tsx:581 | 🗑️ 刪除 button | ~24px (p-1) |
| DocumentLibraryView.tsx:319 | 返回 svg | 20×20 (w-5 h-5) |
| MiniChatWindow.tsx:148-166 | minimize/close | 24×24 (w-6 h-6) |
| TaskCard.tsx 圖片刪除 X | 24×24 (w-6 h-6) | |

**修法：** 改 `min-w-[44px] min-h-[44px]` 或加 `before:absolute before:inset-[-10px]` 擴展 hit area。

---

## 🟡 HIGH（不好用但能用）

### H1. 字級 < 14px 用在主要內容（`text-[10px]` / `text-[11px]`）

12 處、最常見：
- Badge.tsx:56（部門徽章）
- DashboardView.tsx（5×：標籤、計數、徽章）
- TaskCard.tsx（2×：歷程時間戳、進度更新標籤）
- PersonnelView.tsx（3×：角色徽章）
- ChatSystem.tsx, ForumView.tsx, MemoView.tsx, BulletinView.tsx

**修法：** mobile-first → `text-xs sm:text-[10px]`（mobile 12px、桌面才縮）。

### H2. 固定寬度溢出 375px

- `FloatingChatList.tsx:92` `w-80`（320px + 右側 right-6 = 出血）
- `GroupInfoModal.tsx:101` `max-w-md`（448px > 375px）

**修法：** `w-[calc(100vw-2rem)] max-w-sm sm:max-w-md`

### H3. Grid 無 responsive breakpoint（mobile 卡死）

| File | Grid | 問題 |
|------|------|------|
| LeaveManagementView.tsx:1014 / CalendarView.tsx:210 | `grid-cols-7` 日曆 | 53px/格、字塞不下 |
| DepartmentManager.tsx:193 | `grid-cols-8` | **完全壞掉**（每格 ~38px） |
| SubordinateView.tsx:244 | `grid-cols-3` | text 100px |
| LeaveManagementView.tsx:852 | `grid-cols-2`（出勤卡） | 應 mobile 1 欄 |

**修法：** 月曆改 `grid-cols-1 sm:grid-cols-7`（mobile 改 list view）；卡片改 `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`。

### H4. Table `overflow-x-auto` 無 scroll 指示

8 個檔案（PaymentModals、DepartmentDataView、AuditLogView、BackupMonitorView、5 個 Revenue tab）→ 員工不知道往右滑還有內容。

**修法：** 兩條路：
- **A**：mobile 改 card layout（`hidden md:table` + `block md:hidden` card grid）— 工程量大但體驗最好
- **B**：加 fade-edge 視覺提示 + 「← 左右滑」icon hint — 工程量小

### H5. 通知鈴鐺被 `hidden md:block` 藏起來（App.tsx:1551）

員工在手機上看不到未讀通知數！

**修法：** 移除 `hidden md:block`、改用更小的版本放到 hamburger menu 旁邊。

### H6. Modal `max-h-[90vh]` 嵌套滾動

CreateTaskModal、CreateGroupModal、KOLManagementView、LeaveManagementView 等。tall form 內部還要滾、跟外層 page scroll 衝突。

**修法：** `max-h-[100dvh]`（動態視窗）+ sticky header/footer。

---

## 🟢 MEDIUM（polish）

- 多數 hover 動畫無 active 狀態（按下無反饋）→ 全專案加 `active:scale-95`
- 巢狀 scroll container（DepartmentManager 等）
- 缺 `[@media(hover:hover)]` guard，hover 在 mobile 觸發異常

---

## 修法分階段建議

### Phase A — 純機械替換（無風險、20 分鐘、一個 commit）
1. 一次 sed/codemod 把所有 `opacity-0 group-hover:opacity-100` 改 `opacity-100 sm:opacity-0 sm:group-hover:opacity-100`
2. index.html viewport 拿掉 `user-scalable=no maximum-scale=1.0`
3. 加 `.pb-safe` / `.bottom-safe-6` utility 到 index.css
4. 全專案 `text-[10px]` / `text-[11px]` 改 `text-xs sm:text-[10px]`

**影響檔案數：** 約 20、淨改動 ~80 行
**風險：** 0（純樣式）
**員工體驗提升：** 巨大（看得到刪除按鈕、字看得清楚、不被 home indicator 蓋住）

### Phase B — 個別 component 修觸控與 grid（1-2 小時、多個 commit）
1. 所有 `w-5/w-6/w-7/w-8 + h-5/...` 的按鈕加 `min-w-[44px] min-h-[44px]` 或 hit-area expander
2. 日曆改 mobile-first list view
3. FloatingChatList width 動態
4. 通知鈴鐺 mobile 可達

**影響檔案數：** 約 10、需要視覺確認

### Phase C — Table → Mobile Card pattern（半天工程、5+ commit）
所有 Revenue tab + Payment + Audit Log 表格改 mobile-first card stack。

---

## 不做的清單

- 加 `[@media(hover:hover)]` guard：影響桌面 UX、改動範圍大
- 加 `active:` 狀態到每個 hover：屬於 polish、留到後續
- 全專案 Modal 改 sheet pattern：scope creep

---

## 跟 6/4 已修項目互動

[ux-audit-2026-06-04.md](ux-audit-2026-06-04.md) 與 [ux-fix-categorized.md](ux-fix-categorized.md) 處理過 ESC handler / aria / focus ring / 配色 — 這次 mobile audit **完全不重疊**、可獨立進行。
