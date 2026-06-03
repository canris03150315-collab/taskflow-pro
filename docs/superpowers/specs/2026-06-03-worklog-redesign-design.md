# 工作日誌重做 Design Spec

**Date:** 2026-06-03
**Status:** Awaiting user review

## Overview

重做 `components/WorkLogTab.tsx`：對齊新的工作報表中心視覺風格、加入圖片附件（分段附圖）、四項實用功能（複製昨日 / 主管總覽 / 日期 chips / 卡片摺疊），並修補多項既有 UX 問題（觸控目標、無 ESC/背景關、emoji icon、空狀態無 CTA）。

---

## 1. 範圍

- 重做檔案：`components/WorkLogTab.tsx`
- 新增前端元件：`components/files/ImageUploader.tsx`、`components/files/ImageLightbox.tsx`（雖在 files/ 目錄下，但可被工作日誌複用）
- 後端：1 個 Knex migration、`work-logs.js` 路由加 3 個圖片端點
- DB：`work_logs` 表加 `images TEXT` 欄位
- **不做：** 內嵌圖片到文字中（Markdown / 富文本）、圖片編輯、影片、多人協作編輯

---

## 2. 視覺重做（對齊新風格）

| 舊 | 新 |
|----|----|
| `border-gray-200 rounded-lg` | `border-slate-200 rounded-2xl` |
| `text-gray-700` | `text-slate-700` |
| Emoji 結構 icon（📅 📌） | Heroicons SVG |
| 按鈕 `px-3 py-1`（~24px） | `px-3 h-10`（40px）/ `px-3 py-1.5`（36px）|
| 灰主色 `gray-*` | 暖灰 `stone-50` 背景 + `slate-*` 文字 |
| Modal 無 ESC / 背景關 | ESC + 點背景關 + aria-modal |
| Modal 無進場動畫 | `modalEnter` keyframes scale+fade |
| Focus 模糊 | `focus:ring-2 focus:ring-blue-200` |

`number-tabular` 套用所有時間、字數、版本數字。

---

## 3. 4 個新功能

### 3.1 一鍵複製昨日

在新增/編輯 modal 內，若**昨日有該員工的日誌**，顯示按鈕：

```
[📋 從昨日「明天工作事項」複製到今日]
```

點下：
- 把昨日 work_log.tomorrow_tasks 文字塞進 formData.todayTasks
- 若 formData.todayTasks 已有內容，先確認「目前內容會被取代，確定嗎？」
- 不複製圖片（避免誤帶）

Backend：需要 `GET /api/work-logs?userId=me&date=yesterday` — 既有端點已支援，不需改

### 3.2 主管今日總覽（BOSS / MANAGER 限定）

WorkLogTab 頂部多一個區塊：

```
┌─────────────────────────────────┐
│ 📊 今日提交率：8 / 12（67%）     │
│ ████████░░░░                   │
│ 未交：小明、小華、阿傑、小美    │
└─────────────────────────────────┘
```

- 提交率 = 今日有日誌的員工數 / 公司在職員工總數
- 「公司在職員工」= 所有 role ∈ {EMPLOYEE, SUPERVISOR} 的用戶（排除 BOSS / MANAGER）
- 未交清單：列名字 chip，點擊 chip 預填篩選器（部門/員工）
- 只有 BOSS/MANAGER 看得到此區塊

Backend：新端點 `GET /api/work-logs/submission-stats?date=YYYY-MM-DD`
回傳 `{ submitted: [userId...], notSubmitted: [{userId, name, department}...], totalEligible: 12 }`

### 3.3 快速日期 chips

日期欄左邊：

```
[昨天] [今天] [本週] 📅 [日期欄]
```

- **今天 / 昨天** — 設定 selectedDate
- **本週** — 切換到「週模式」，顯示員工本週所有日誌（清單按日期由近到遠）
- 自訂日期 → 退出週模式

「本週」狀態下，篩選器仍可用（部門/員工），但 selectedDate 變成 dateRange。
- 一般員工點「本週」 → 預設只顯示自己的日誌
- BOSS/MANAGER 點「本週」 → 顯示全公司日誌（受部門/員工篩選器影響）

### 3.4 卡片摺疊 + 字數計

- **卡片**：任一段落超過 200 字 → 顯示前 3 行 + 漸層遮罩 + 「展開全文」按鈕
- **Modal 文字框**：右上角顯示「X / 500 字」
  - X ≤ 300：灰色
  - 300 < X ≤ 500：橘色 `text-amber-600`
  - X > 500：紅色 `text-red-600`，不阻擋送出（軟提示）

---

## 4. 圖片附件（核心新功能）

### 4.1 資料模型

新增欄位（idempotent migration）：
```sql
ALTER TABLE work_logs ADD COLUMN images TEXT;
```

JSON 結構：
```json
{
  "today": [
    { "hash": "sha256...", "filename": "bug-screenshot.png",
      "size": 1234567, "mime_type": "image/png",
      "uploader_id": "user-xxx", "uploaded_at": "2026-06-03T..." }
  ],
  "tomorrow": [...],
  "notes": [...]
}
```

若欄位為 NULL → 視為 `{ today: [], tomorrow: [], notes: [] }`。

### 4.2 限制

- 每張：10 MB
- 每段：10 張
- 全篇：30 張（自然上限：3 段 × 10）
- 格式：`image/jpeg`, `image/png`, `image/webp`, `image/gif`

### 4.3 儲存策略

- 重用 `backend/dist/services/fileStorage.js` 工具
- Blob 存 `data/uploads/<hash 前 2>/<hash>.<ext>`（與檔案管理同池）
- Hash 共用 blob（透明、安全）：work_log 跟 file_version 共用 reference，blob 只有當所有 reference 都消失才被清

### 4.4 API 端點

#### `POST /api/work-logs/:id/images`
multipart/form-data:
- `file` — 圖片
- `section` — `today` | `tomorrow` | `notes`

權限：只有日誌作者（user_id === currentUser.id）

Response:
```json
{
  "image": { "hash": "...", "filename": "...", "size": ..., "mime_type": "...",
             "uploader_id": "...", "uploaded_at": "..." },
  "section": "today"
}
```

驗證：
- 段落圖片數 < 10
- 檔案 ≤ 10 MB
- mime_type ∈ ALLOWED_IMAGE_MIME

#### `GET /api/work-logs/images/:hash/:filename`
- 串流 blob 給瀏覽器（`inline` disposition）
- 權限：必須能看到至少一份引用此 hash 的 work_log

簡化版權限：先檢查 hash 是否出現在任何 work_log.images JSON，若有則確認 user 對該 log 有讀取權（user 是作者 / BOSS / MANAGER）。

#### `DELETE /api/work-logs/:id/images/:hash?section=today`
- 從 work_logs.images JSON 該段移除 hash
- 不立刻刪 blob（讓 trashCleanup cron 處理引用清零）
- 權限：日誌作者 OR BOSS / MANAGER

### 4.5 Cron 清理

更新 `backend/dist/jobs/trashCleanup.js`：清理過期 file_versions 後，刪 blob 前**也檢查 work_logs.images** 是否還引用該 hash。

具體邏輯：
1. 找出所有 `file_versions.is_deleted = 1 AND deleted_at < now - 48h` 的 hash
2. 對每個候選 hash：檢查 `work_logs` 表是否有任何 row 的 `images` JSON 包含此 hash
3. 若沒有任何引用 → 刪 blob 檔案；若有 → 保留 blob，下次再檢查

當 work_logs 紀錄被刪除（或 image 被移除）→ JSON 中的 reference 消失 → 下一次 cleanup cron 才會清 blob（不會即時刪）。這是可接受的延遲，每小時跑一次 cron。

---

## 5. 前端架構

### 5.1 新元件

**`components/files/ImageUploader.tsx`** — 圖片上傳區
```tsx
interface ImageUploaderProps {
  images: ImageRef[];
  maxCount: number;
  onAdd: (file: File) => Promise<void>;
  onRemove: (hash: string) => Promise<void>;
  onPreview: (image: ImageRef, idx: number) => void;
  disabled?: boolean;
}
```

UI：圖片網格（80x80 縮圖）+ 最後一格「+ 上傳」按鈕（接受拖檔）。

**`components/files/ImageLightbox.tsx`** — 圖片放大瀏覽
```tsx
interface ImageLightboxProps {
  images: ImageRef[];
  initialIndex: number;
  onClose: () => void;
}
```

UI：modal 重用工作報表 preview 的 pattern（ESC 關、點背景關、進場動畫、左右切換、下載按鈕）。

### 5.2 WorkLogTab 結構

```
WorkLogTab
├─ SubmissionStatsPanel (BOSS/MANAGER only)
├─ DateNavigator (chips + date input)
├─ FilterRow (部門 + 員工)
├─ Action (新增日誌)
├─ LogList
│  └─ LogCard
│     ├─ Header (員工 · 部門 · 日期 · 操作按鈕)
│     ├─ Section (today/tomorrow/notes)
│     │  ├─ Text (with collapse if > 200 chars)
│     │  └─ ImageGrid (read-only)
└─ LogModal
   ├─ CopyFromYesterdayButton
   ├─ FormSection × 3
   │  ├─ Textarea (with char count)
   │  └─ ImageUploader
   └─ Footer (取消 / 儲存)
```

### 5.3 API client (services/api.ts)

新增 `api.workLogs.images`:
- `upload(workLogId, section, file)` — multipart
- `getUrl(hash, filename)` — return `/api/work-logs/images/${hash}/${filename}`
- `delete(workLogId, hash, section)`

`api.workLogs.getSubmissionStats(date)` — for manager panel

---

## 6. 權限矩陣

| 動作 | 員工（自己）| 員工（別人）| MANAGER | BOSS |
|------|--------------|--------------|---------|------|
| 看自己日誌 | ✅ | — | ✅ | ✅ |
| 看別人日誌 | ✅（同部門）| ✅（同部門）| ✅（全部） | ✅（全部） |
| 新增 / 編輯日誌 | ✅ | ❌ | ✅ | ✅ |
| 刪日誌 | ✅ | ❌ | ✅ | ✅ |
| 上傳圖片到日誌 | ✅（自己日誌） | ❌ | ✅（自己日誌）| ✅（自己日誌）|
| 刪圖 | ✅（自己上傳的）| ❌ | ✅（任何圖）| ✅（任何圖）|
| 主管總覽 | ❌ | ❌ | ✅ | ✅ |

「同部門」沿用既有的部門過濾邏輯。

---

## 7. 範圍外（明確不做）

- 內嵌圖片到文字中（Markdown / 富文本編輯器）
- 圖片編輯（裁切 / 濾鏡）
- 影片或音訊附件
- 多人協作即時編輯
- 日誌的版本歷史（不像檔案管理需要）
- 工作日誌的「公司檔案 tab 透明窗」概念（日誌權限已由部門控制）

---

## 8. 風險與緩解

| 風險 | 緩解 |
|------|------|
| 大量圖片上傳塞硬碟 | 限制 10 MB/張、30 張/篇；hash dedup；blob cleanup |
| 圖片預覽 mobile 體驗差 | Lightbox 響應式設計、縮圖網格 grid-cols-3 sm:grid-cols-4 |
| 「主管總覽」查詢效能 | submission-stats 端點先 cache 5 分鐘（簡單 in-memory） |
| 「本週」模式回傳大量日誌 | 限制最多 7 天 × 用戶數，預設只顯示自己；BOSS/MANAGER 才看全部 |
| 圖片上傳 mid-upload 失敗 | 前端顯示 loading state，失敗 toast + retry 按鈕 |

---

## 9. 依賴

- 後端：重用 `fileStorage.js`、`multer`（已裝）
- 前端：無新 npm 套件，重用既有 Tailwind / Heroicons inline SVG / showConfirm
- 圖片格式：不需 sharp / imagemagick — 直接存原檔，瀏覽器自己 render

---

## 10. 既有資料相容

- 既有的 work_logs 紀錄 `images = NULL`
- 前端讀取時 `images || '{"today":[],"tomorrow":[],"notes":[]}'`
- 既有日誌打開時顯示無圖（圖片區為空 + 「+ 上傳」按鈕）
- 第一次儲存時才寫入 JSON
