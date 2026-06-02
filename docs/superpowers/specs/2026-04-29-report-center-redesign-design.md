# 工作報表中心重做 Design Spec

**Date:** 2026-04-29
**Status:** Awaiting user review

## Overview

把現有以「博弈業表單填寫」為核心的 ReportView 整個重做，改為「雲端硬碟風格的檔案管理系統」。員工可以上傳 Excel / Word / PDF / 圖片等檔案，系統用智慧版本管理（同名同人靜默加版本、跨人協作跳 modal），並透過 48 小時透明窗讓全公司即時看到動態，過期後僅 BOSS/MANAGER 看得到。

---

## 1. 範圍

### 1.1 重做範圍

整個 ReportView 4 個 tab 重新設計：

| 舊 tab | 新 tab | 處理 |
|--------|-------|------|
| 工作日誌 (WorkLogTab) | 工作日誌 | 保留現有功能（員工每日工作日誌），位置改到第 3 |
| 報表（博弈業表單） | **我的檔案 + 公司檔案** | 拆成兩個 tab，整個從表單改成檔案管理 |
| 審核 (AuditLog) | 操作紀錄 | 轉型：不再雙重審核流程，純記錄上傳/下載/刪除 |
| 平台帳號 (PlatformAccountsView) | — | **拿掉**（博弈業特定，公司已轉型） |

### 1.2 新 ReportView 結構

```
工作報表中心
├─ 📁 我的檔案      ← 員工自己上傳 / 管理檔案的主場
├─ 🌐 公司檔案      ← 員工：看 48h 內全公司新動態；BOSS/MANAGER：看全部
├─ 📝 工作日誌      ← 保留原有的工作日誌功能
└─ 🔍 操作紀錄      ← BOSS/MANAGER 限定：誰上傳/下載/刪除什麼
```

---

## 2. 核心邏輯

### 2.1 檔案上傳邏輯（智慧版本管理）

| 情境 | 系統行為 |
|------|---------|
| **同檔名 + 同上傳者** | 直接 silent 加為新版本，右下角顯示 toast「已加為 v_N」 |
| **同檔名 + 不同上傳者** | 跳 modal 讓上傳者選擇：「加為對方的新版本」或「建立我自己的同名檔（v1）」 |
| **不同檔名** | 新檔案，進「我的檔案」 |

**說明：** `files` 表的 unique constraint 是 `(filename, owner_id)`，所以同一個檔名可以被多位員工各自擁有。「小華的銷售報表.xlsx」和「小明的銷售報表.xlsx」是兩個獨立的 file record，各自有自己的版本鏈。

**內容 hash（SHA-256）的角色：** 只用於顯示提示資訊（例如「與 v3 內容相同」標籤），**永不**用於決定是否儲存。每次上傳都會建立新的 version record。

**Hash dedup 在 blob 層：** 同 hash 共用 storage blob（省空間），但 version record 各自獨立。任何 record 還在，blob 就不會被清理。

### 2.2 權限模型

| 動作 | 員工（自己的） | 員工（別人的） | MANAGER | BOSS |
|------|---------------|---------------|---------|------|
| 上傳新檔 | ✅ | — | ✅ | ✅ |
| 加新版本到自己的檔 | ✅ | — | ✅ | ✅ |
| 加新版本到別人的檔 | ✅（48h 透明窗內看得到才能）| ✅ | ✅ | ✅ |
| 預覽 / 下載自己上傳的 | ✅ | — | ✅ | ✅ |
| 預覽 / 下載別人的（48h 內）| ✅ | ✅ | ✅ | ✅ |
| 預覽 / 下載別人的（48h 後）| ✅ | ❌ | ✅ | ✅ |
| 刪除版本（軟刪除）| ✅（自己上傳的）| ❌ | ✅ | ✅ |
| 看垃圾桶 | ✅（自己刪的）| ❌ | ✅ | ✅ |
| 看操作紀錄 | ❌ | ❌ | ✅ | ✅ |

### 2.3 48 小時透明窗

- **員工視角**：「公司檔案」tab 只顯示「過去 48 小時內**有任何版本上傳**」的檔案。新版本上傳會重置整個檔的 48h 計時器。
- **BOSS/MANAGER 視角**：「公司檔案」tab 顯示所有檔案，不受 48h 限制。
- 一份檔超過 48h 沒新版本 → 對員工從「公司檔案」消失，但仍存在於上傳者本人的「我的檔案」。

### 2.4 刪除規則

- **誰能刪**：上傳者本人 + BOSS/MANAGER
- **粒度**：只能刪單一版本（沒有「整份檔案一次刪除」按鈕，防誤刪）
- **救回**：軟刪除 + 48 小時垃圾桶，過期自動硬刪
- **整份檔消失**：當一份檔的所有版本都被刪 → 該 file record 在列表自動消失

### 2.5 檔案類型與大小

- **接受類型**：Office 全家桶（Excel / Word / PowerPoint）+ PDF + CSV + 純文字 + 圖片（jpg / png）
- **檔案大小上限**：25 MB
- **預覽支援**：Excel（用 SheetJS）+ PDF（瀏覽器原生）。其他類型只能下載
- **拒絕類型**：執行檔（.exe / .bat / .sh）、壓縮檔（.zip / .rar / .7z）、影片、音訊

### 2.6 搜尋與篩選

- 檔名搜尋（前端 filter）
- 篩選：上傳者、日期範圍、檔案類型
- 排序：時間新→舊（預設）、檔名 A→Z、檔案大小

**範圍外**：全文搜尋（檔案內容搜尋），未來再加（schema 預留 `content_text` 欄位）。

### 2.7 通知

- 員工上傳檔案：**靜默上傳**（不發任何通知）
- 員工只看右下角 toast 確認上傳成功
- 未來可擴充：@提及功能

### 2.8 操作紀錄（審計）

記錄三種動作：**上傳 / 刪除 / 下載**

不記錄：預覽（雜訊太多，員工會點很多次確認內容）

每筆紀錄欄位：`時間`、`操作者`、`動作`、`目標檔名`、`版本號`、`IP 位址`（選填）

---

## 3. 架構

### 3.1 系統圖

```
┌─────────────────────────────────────────────────┐
│                 前端（React）                    │
│  ReportView                                      │
│  ├─ MyFilesTab        我的檔案                  │
│  ├─ CompanyFilesTab   公司檔案（48h 透明窗）    │
│  ├─ WorkLogTab        工作日誌（保留）          │
│  └─ OperationsLogTab  操作紀錄（BOSS/MANAGER）  │
│                                                  │
│  共用組件：                                       │
│  ├─ UploadModal       智慧上傳對話框             │
│  ├─ FileListItem      檔案列項目（展開版本）     │
│  ├─ VersionList       版本歷史列表               │
│  ├─ ExcelPreview      Excel 預覽（SheetJS）     │
│  └─ TrashView         垃圾桶                     │
└─────────────────────────────────────────────────┘
                       ↕
┌─────────────────────────────────────────────────┐
│              後端（Express）                     │
│  /api/files/*                                    │
│    POST   /upload          上傳檔案              │
│    POST   /check-conflict  上傳前查詢同名衝突   │
│    GET    /                列檔案（依角色）     │
│    GET    /:id             檔案詳情 + 版本列表  │
│    GET    /:id/v/:n        下載特定版本          │
│    GET    /:id/v/:n/preview  Excel 預覽資料      │
│    DELETE /:id/v/:n        軟刪除版本            │
│    POST   /:id/v/:n/restore  從垃圾桶救回        │
│    GET    /trash           看垃圾桶              │
│    GET    /operations      操作紀錄（角色限定）  │
└─────────────────────────────────────────────────┘
                       ↕
┌─────────────────────────────────────────────────┐
│         儲存（容器 volume mount）                │
│  /app/backend/data/                              │
│    ├─ taskflow.db    SQLite (metadata)          │
│    └─ uploads/                                   │
│       ├─ <hash 前 2 碼>/                         │
│       │   └─ <full-hash>.<ext>  (實體 blob)     │
│       └─ ...                                     │
└─────────────────────────────────────────────────┘
```

### 3.2 資料模型

**`files` — 邏輯檔案（每個檔案的 root）**
```sql
CREATE TABLE files (
  id                   TEXT PRIMARY KEY,
  filename             TEXT NOT NULL,           -- '銷售報表.xlsx'
  owner_id             TEXT NOT NULL,           -- 首次上傳者 user_id
  created_at           TEXT NOT NULL,
  latest_uploaded_at   TEXT NOT NULL,           -- 用來算 48h 透明窗
  is_deleted           INTEGER DEFAULT 0,       -- 整份檔已消失（所有版本都被刪）
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
CREATE INDEX idx_files_owner ON files(owner_id);
CREATE INDEX idx_files_filename_owner ON files(filename, owner_id);  -- 加速同人同名查詢
CREATE INDEX idx_files_latest ON files(latest_uploaded_at);          -- 加速 48h 透明窗查詢
```

**`file_versions` — 版本歷史**
```sql
CREATE TABLE file_versions (
  id              TEXT PRIMARY KEY,
  file_id         TEXT NOT NULL,
  version_no      INTEGER NOT NULL,            -- 1, 2, 3...
  uploader_id     TEXT NOT NULL,
  uploaded_at     TEXT NOT NULL,
  content_hash    TEXT NOT NULL,               -- SHA-256
  blob_path       TEXT NOT NULL,               -- 'uploads/ab/abcdef...xlsx'
  file_size       INTEGER NOT NULL,
  mime_type       TEXT NOT NULL,
  note            TEXT,                        -- 員工版本備註（選填）
  is_deleted      INTEGER DEFAULT 0,
  deleted_at      TEXT,
  deleted_by      TEXT,
  FOREIGN KEY (file_id) REFERENCES files(id),
  FOREIGN KEY (uploader_id) REFERENCES users(id),
  UNIQUE (file_id, version_no)
);
CREATE INDEX idx_versions_file ON file_versions(file_id);
CREATE INDEX idx_versions_uploader ON file_versions(uploader_id);
CREATE INDEX idx_versions_hash ON file_versions(content_hash);       -- 加速 hash 比對
CREATE INDEX idx_versions_deleted_at ON file_versions(deleted_at);   -- 垃圾桶 48h 清理用
```

**`file_operations` — 操作紀錄**
```sql
CREATE TABLE file_operations (
  id           TEXT PRIMARY KEY,
  action       TEXT NOT NULL,                  -- 'upload' | 'delete' | 'download' | 'restore'
  actor_id     TEXT NOT NULL,
  file_id      TEXT NOT NULL,
  version_id   TEXT,                           -- 操作的特定版本（upload/delete/download/restore 都有）
  created_at   TEXT NOT NULL,
  ip_address   TEXT,
  FOREIGN KEY (actor_id) REFERENCES users(id),
  FOREIGN KEY (file_id) REFERENCES files(id)
);
CREATE INDEX idx_ops_created ON file_operations(created_at);
CREATE INDEX idx_ops_actor ON file_operations(actor_id);
```

### 3.3 檔案儲存策略

- **實體 blob 存硬碟**：路徑 `uploads/<hash前2碼>/<full-hash>.<ext>`，前 2 碼分桶避免單一目錄檔案過多
- **DB 只存 metadata**：filename / hash / size / blob_path / 上傳者 / 時間等
- **Hash 共用**：同 hash 的多個 version_record 指向同一個 blob 檔案，blob 引用計數 = 該 hash 對應的未刪除 version_records 數量
- **Blob 清理時機**：
  - 軟刪除：version_record.is_deleted = 1
  - 過 48h 自動清理：DELETE version_records WHERE is_deleted = 1 AND deleted_at < (now - 48h)
  - Blob 清理：當該 hash 的所有 version_records 都被清掉 → 刪 blob 檔案

### 3.4 主要 API 端點規格

#### `POST /api/files/check-conflict`
上傳前查詢同名衝突（前端在使用者拖檔後立即呼叫）。

Request:
```json
{
  "filename": "銷售報表.xlsx",
  "content_hash": "abc123..."
}
```

Response:
```json
{
  "same_user_match": {
    "file_id": "file-xxx",
    "version_count": 14,
    "latest_version_no": 14
  },
  "cross_user_matches": [
    {
      "file_id": "file-yyy",
      "owner_id": "user-zzz",
      "owner_name": "小華",
      "version_count": 5,
      "hash_matches_latest": true   // 內容是否與最新版完全相同
    }
  ]
}
```

決策邏輯（前端）：
- 如果 `same_user_match` 存在 → 直接 silent 加版本（呼叫 /upload）
- 如果只有 `cross_user_matches` → 跳 modal 給使用者選
- 都沒有 → 直接 silent 上傳當新檔

#### `POST /api/files/upload`
實際上傳檔案。

multipart/form-data:
- `file`: 檔案本體
- `target_file_id`: 加為哪個 file 的新版本（如沒給 → 建新 file record）
- `note`: 版本備註（選填）

Response:
```json
{
  "file_id": "file-xxx",
  "version_id": "ver-yyy",
  "version_no": 15,
  "uploaded_at": "2026-04-29T14:30:00Z"
}
```

#### `GET /api/files`
列檔案（依角色決定範圍）。

Query params:
- `scope`: `mine` | `company`
- `q`: 搜尋關鍵字（filename）
- `uploader_id`: 篩選上傳者
- `from_date` / `to_date`: 篩選日期範圍
- `file_type`: 篩選類型

Response: 列表，含每個 file 的最新版資訊 + 版本總數。

#### `GET /api/files/:id`
單一檔案詳情，含所有版本（依角色過濾掉看不到的）。

#### `GET /api/files/:id/v/:n`
下載特定版本。權限檢查通過 → 串流 blob 檔案。

#### `GET /api/files/:id/v/:n/preview`
Excel 預覽資料（後端用 xlsx 庫解析成 JSON 給前端 render）。PDF 直接回原檔讓瀏覽器內建處理。

#### `DELETE /api/files/:id/v/:n`
軟刪除版本（set is_deleted = 1, deleted_at = now, deleted_by = current_user）。

#### `POST /api/files/:id/v/:n/restore`
從垃圾桶救回（is_deleted = 0, clear deleted_at/deleted_by）。

#### `GET /api/files/trash`
列垃圾桶內容（自己刪的 / BOSS/MANAGER 看全部）。

#### `GET /api/files/operations`
操作紀錄（BOSS/MANAGER 限定）。

---

## 4. UI 設計

詳見 mockup：
- `C:\tmp\taskflow-report-redesign-mockup-v2.html` — 基本畫面（含優化過的 UX）
- `C:\tmp\taskflow-report-redesign-mockup-v3.html` — 同人上傳邏輯 + 30 版本折疊

關鍵 UX 規則：
- 圖示：Heroicons SVG，按檔案類型給語意色（Excel 綠 / Word 藍 / PDF 紅）
- 狀態提示：顏色 + 圖示 + 文字三層（無障礙）
- 按鈕：最少 36px 高、focus ring 3px 藍
- 數字：`font-variant-numeric: tabular-nums` 對齊整齊
- 版本列表：預設顯示最近 5 個，更舊版本「展開查看」

---

## 5. 既有資料處理（待 user 確認）

現有 `reports` 表內有舊的博弈業日報資料（DailyReportContent 結構）。處理方式建議：

**推薦：選項 A（全部清空）**
- 公司已從博弈業轉型，舊資料無業務價值
- 在 migration script 加入：先把舊 reports 表的內容匯出成 JSON 備份檔（存到 backend/data/migrations/old-reports-backup-YYYY-MM-DD.json）
- 然後 DROP TABLE reports，DROP TABLE report_authorizations 等相關表
- 用 Knex migration 管理

如果你想保留只讀視窗（選項 B），spec 之後再追加一個「歷史報表」入口。

---

## 6. 範圍外（不做）

- 全文搜尋（檔案內容搜尋）
- 線上編輯 Excel
- 自動通知 / @提及功能
- 檔案分享連結（外網存取）
- 檔案資料夾結構（暫時扁平，未來再加）
- 「整份檔一次刪除」按鈕（只能逐版刪）

---

## 7. 風險與緩解

| 風險 | 緩解 |
|------|------|
| 25 GB 硬碟被填滿 | 個別檔案 25 MB 上限 + Hash dedup + 48h 透明窗讓刪除有節奏 |
| Hash 計算耗時 | 前端用 Web Crypto API 算 SHA-256，幾百毫秒內 |
| Excel 預覽炸 RAM | SheetJS 處理大檔有風險，超過 5 MB 改為「請下載查看」 |
| 上傳當下伺服器斷線 | 上傳失敗不留下 partial record；如成功但 blob 寫入失敗 → 後端 transaction rollback |
| 4 台公司資料隔離 | 沿用現有部署架構，每台 Droplet 獨立 DB + uploads 目錄 |

---

## 8. 依賴

- **新前端依賴**：
  - `xlsx` (SheetJS)：Excel 預覽
  - 既有的 React / Tailwind / Heroicons 都已有
- **新後端依賴**：
  - `multer`：multipart upload handling
  - `xlsx`：後端 Excel 預覽資料處理（轉 JSON）
- **無新基礎建設**：用既有的 Droplet + Docker volume + SQLite
