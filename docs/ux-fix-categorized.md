# UX 修復分類清單

按「會影響邏輯」vs「純 UI」分類，幫你決定哪些可以放心改、哪些需要回歸測試。

---

## 🔧 會影響邏輯/行為（需測試）

這些改動會新增 / 改變使用者互動，要逐一驗收。

### A. Modal 加 ESC / 點背景關閉

**影響：** 使用者按 ESC 或點 modal 外的灰底會關掉 modal。
**風險：** 員工正在填表單時不小心點到背景 → 內容丟失（可加「未儲存確認」緩衝，但範圍變大）

影響檔案：
| 檔案 | Modal 數 | 備註 |
|------|---------|------|
| KOLManagementView.tsx | 3 | 跨多個操作流程 |
| PaymentModals.tsx | 3 | 財務輸入 — **點背景關掉風險最高** |
| LeaveManagementView.tsx | 4 | 假期申請流程 |
| ChangePasswordModal.tsx | 1 | 短表單，安全 |
| DataCleanupView.tsx | 2 | 危險動作（資料清理）— **建議不點背景關，只加 ESC** |
| DepartmentDataView.tsx | 1 | 編輯打卡 modal |

### B. Modal 加 `aria-modal` / `role="dialog"`

**影響：** 螢幕閱讀器使用者能正確被告知這是對話框（無視覺改動）
**風險：** 0
**檔案：** 全部上述 modal

### C. `<input>` 加 focus ring

**影響：** 鍵盤使用者 Tab 過去能看見游標位置
**風險：** 0（純加屬性）
**檔案：** PaymentModals.tsx (所有 input)、PerformanceView.tsx 月份選擇器

---

## 🎨 純 UI 改動（不影響行為）

這些只改外觀，行為不變。可以一次大改不擔心壞功能。

### D. 配色統一：`gray-*` → `slate-*` / `stone-*`

**影響：** 顏色微調，元件看起來更一致（暖灰 + 藍灰）
**檔案數：** 9 個（KOL/Audit/5 個 Revenue/AI/Central/Platform）
**改動量：** ~80 處屬性字串替換

### E. Card 半徑：`rounded-lg` → `rounded-2xl`

**影響：** 卡片角更圓
**檔案：** AuditLogView / CentralDashboard / DataCleanup / LeaveManagement modals

### F. Emoji 結構 icon → Heroicons SVG

**影響：** Icon 跨平台一致、能套主題色
**有 emoji 結構 icon 的位置：** 約 25 處

| 位置 | Emoji | 改成 |
|------|-------|------|
| KOLManagementView header | 💰 | CurrencyDollarIcon |
| LeaveManagementView tabs | 📅 ⚙️ 📋 | Calendar / Cog / ListBullet |
| DepartmentDataView tabs | 📝 📋 💰 | Document / List / Currency |
| Dashboard sections | 🚀 📊 | Rocket / ChartBar |
| Calendar headers | 📅 | Calendar |
| AuditLogView header | 📋 | ListBullet |
| PerformanceView title | 🏆 | Trophy |
| ChangePasswordModal | 🔐 | LockClosed |
| DocumentReaderPage error | ❌ | XCircle |
| DailyTasksTab | ✅ 📋 | CheckCircle / List |

### G. 載入文字 → Spinner SVG

**影響：** Loading 從一行字變成轉圈圈，視覺更有反饋
**檔案：** 10 個（AuditLog / 5 個 Revenue / AI / WorkLogView / Memo / SubordinateRoutine / DocLib / DocReader / DailyTasks / KOL）

---

## 📊 不影響邏輯的優先級

如果你想先看到「全專案視覺一致」效果但又不想動到 UI 互動：

**Phase 1（純 UI，0 邏輯風險）**：D + E + F + G — 一次 batch replace 改超過 40 處
**Phase 2（無障礙增強）**：B + C — 純加屬性，沒視覺改動，行為無感
**Phase 3（modal 改互動）**：A — 一個 modal 一個 modal 慢慢加 ESC、確認後再加點背景關

---

## 推薦做法

1. **先做 Phase 1（純 UI）** — 1 個 commit / 1 大批替換 → 全專案看起來一致
2. **再做 Phase 2（無障礙）** — 1 個 commit / 多檔加 aria 屬性
3. **最後 Phase 3（modal 互動）** — 每個 modal 個別測，謹慎加
