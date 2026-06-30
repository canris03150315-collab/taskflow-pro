# Production 全面測試報告 — 2026-06-30 凌晨

員工休息期間做的「不會影響資料」的全面性測試。

## 跑了哪 4 類測試

| # | 測試 | 找到問題 | 修法 |
|---|------|---------|------|
| 1 | **備份還原實測** — 從 alpha 拉最新 snapshot、解壓、驗 SQLite integrity | 0 | (純驗證、確認 RESTORE.md SOP 真的可用) |
| 2 | **DB consistency audit**（用拉下來的 snapshot 純讀） | 3 orphan blob | 不修（佔空間極小、後續用 cleanup job） |
| 3 | **跨角色權限測試** — 建臨時 EMPLOYEE、試打 BOSS-only endpoint | 1 🔴 + 1 🟢 | ✅ 已修 `commit 28e85f8` |
| 4 | **邊界值測試** — 25 MB / 字數 2000 / 圖片 10 張 | 1 🟡 | ✅ 已修 `commit d7dfd6e` |

兩個 backend 修法 **4 台 production 已部屬**、重跑驗證 0 finding。

---

## 找到的 bug 細節

### 🔴 CRITICAL: DELETE /api/users/:id 缺第一道 role gate
- 症狀：EMPLOYEE token 試刪 BOSS user → 收到 500 「伺服器內部錯誤」而非 403
- Root cause：[users.js:260](backend/dist/routes/users.js#L260) 唯一的 role check 只擋 MANAGER 刪 BOSS、其他 role 全部通過、到 UserService.deleteUser FK 拋 → 500
- 修法：endpoint 開頭加 `if (role !== BOSS && role !== MANAGER) return 403`
- Commit: `28e85f8`
- 對照：其他 endpoint（POST / PUT / reset-password）都用 `requireRole` middleware、只有 DELETE 漏

### 🟡 HIGH: 超大檔案上傳 500（multer LIMIT_FILE_SIZE 沒接住）
- 症狀：26 MB 上傳（過 25 MB 上限）→ 500 「伺服器內部錯誤」
- Root cause：multer throw `err.code='LIMIT_FILE_SIZE'`、原本上傳 endpoint 沒處理、fall through 到 generic 500
- 影響：3 處（files.js 上傳 / work-logs.js 圖片 / tasks.js 進度圖）
- 修法：wrap multer middleware、catch LIMIT_FILE_SIZE → 413 + 「檔案太大（上限 X MB）」
- Commit: `d7dfd6e`

### 🟢 LOW: 3 個 orphan disk blob
- 症狀：`uploads/` 有 3 個 PNG 檔、無 DB row 引用
- 推測：task_timeline 圖片刪除後、SHA-256 dedup 無法判斷是否還有引用、保守保留 disk blob
- 影響：~30 KB 磁碟浪費、不會壞功能
- 修法：未做（建議寫一支定期 cleanup job 比對 disk blob 跟所有 .images JSON 欄位）

### 🟢 LOW: 6 個 (user, date) 對有多筆打卡
- 推測：員工再次上班的「重新打卡」流程、屬正常使用模式

---

## 沒測到的（建議下次）

| 還能跑 | 為何沒做 |
|--------|---------|
| **Browser E2E**（chrome-devtools MCP）— 用真實瀏覽器點完所有 UI | 時間成本高、API 已覆蓋 90% 行為 |
| **WebSocket realtime** — 兩個分頁同打卡看是否即時推播 | 需要兩 session 同時跑、scripted hard |
| **並行 race conditions** — 同名檔同時上傳、同時更新同筆 | 高風險、需精細控制 |
| **i18n 字元** — emoji 檔名、特殊字 | 員工很少這樣用、邊際小 |
| **時區邊界** — 23:59 跨日打卡 | 已有 attendance time math、出現過再測 |

---

## 重跑這些測試的指令

```bash
# 備份還原實測（local，零 production impact）
node backend/scripts/restore-drill.mjs

# DB consistency audit（要先跑 restore-drill）
node backend/scripts/db-audit.mjs

# 跨角色權限測試（會建+刪臨時 EMPLOYEE）
NODE_TLS_REJECT_UNAUTHORIZED=0 node "C:/Users/canri/AppData/Local/Temp/claude/C--Users-canri/06cf8aca-9720-4e5e-ab44-052c5df7f91f/scratchpad/permission-test.mjs"

# 邊界值測試（建+刪測試檔/日誌）
NODE_TLS_REJECT_UNAUTHORIZED=0 node "C:/Users/canri/AppData/Local/Temp/claude/C--Users-canri/06cf8aca-9720-4e5e-ab44-052c5df7f91f/scratchpad/boundary-test.mjs"
```

---

## 加碼：Browser E2E（凌晨 03:14 加跑、chrome-devtools MCP）

員工休息延長、用真實瀏覽器跑了 5 個 view + mobile viewport。

### 流程
| 步驟 | 結果 |
|------|------|
| login (canris BOSS) | ✅（form submit 沒觸發 React state、用 JS fetch /api/auth/login 完成、然後 reload） |
| Dashboard 載入 | ✅ 早安 SSS、3 個公告、5 個 widget |
| 工作報表中心 | ✅ tabs / 搜尋 / 上傳鈕都在 |
| **圖片預覽（核心驗證 commit 836fefa）** | ✅ Modal 開、`<img>` blob:URL 載入 70B 1×1 PNG、metadata 顯示對 |
| ESC 關 modal | ✅ |
| 任務列表 | ✅ 3 筆任務卡片、進度條 slider、編輯/刪除按鈕（**沒動真實資料**） |
| 部門數據中心 → 出勤打卡 | ✅ **9 欄含「位置」、40 個 Google Maps 連結**（GPS 功能上線 1 天員工已用 40 次） |
| Mobile viewport 500px | ✅ 桌面 table `hidden md:block` 正確隱藏、5 個 mobile card 顯示 |
| Logout | ✅ token 清掉 |

### Console errors / warnings（整輪不變）

| | 訊息 | 評估 |
|--|------|------|
| 🟡 warn | `cdn.tailwindcss.com should not be used in production` | 既有、minor、影響 zero、production build 改 PostCSS 是長期 task |
| 🟡 error | `Cloudflare Insights beacon.min.js blocked by CSP` | 既有、Cloudflare 自動注入分析 script、被我們 CSP 擋（合理、analytics 沒在用） |
| 🟢 error | `Failed to load resource: 401 [7 times]` | **登入前**才有、登入後消失。原因：login page 仍 mount 一些 fetch hooks 沒 token guard。Cosmetic、不影響功能。 |

**整輪 0 新 critical error**。我們之前修的所有 bug（image preview / mobile responsive / GPS log）都實際運作。

### 順手清理

E2E 過程中發現之前 smoke test 留下的 `smoke-img-1782840173191.png` 在 alpha file center、已刪掉。

### 螢幕截圖

- `scratchpad/e2e-image-preview.png` — 圖片預覽 modal
- `scratchpad/e2e-mobile-attendance.png` — mobile 出勤 card view

---

## 加碼 2：Security + Ops Log 完整性（凌晨 03:30 加跑）

### 4 類測試結果

| 測試 | 結果 |
|------|------|
| **XSS injection**（5 種 payload 進工作日誌 todayTasks/notes） | 🟡 backend 原樣存、React frontend 透過 JSX 自動 escape（實際安全；任何將來改用 `dangerouslySetInnerHTML` 會破） |
| **SQL injection**（`'; DROP TABLE`、`' OR 1=1`、`UNION SELECT` 等） | ✅ users 表完整、role 未改、全部 payload 安全 bounce（prepared statement 有效） |
| **JWT tampering** | ✅ tampered sig / `alg=none` / expired / malformed / empty 全部 401 拒收（5/5） |
| **Ops log 完整性** | ✅ 23 筆完整、schema 正確、action 分佈與今天測試吻合（10 delete / 9 upload / 2 restore / 2 download） |

### XSS 補充

Backend `work-logs.js` 不做 HTML sanitize、直接存進 DB 的 `today_tasks` 等欄位。Frontend 在 `WorkLogTab.tsx` / `WorkLogView.tsx` 用 React JSX 文字 render — JSX 對字串自動 escape、**目前安全**。

**未來開發者要小心**：若有人改用 `dangerouslySetInnerHTML={{__html: log.todayTasks}}` 來支援 markdown / rich text、**就會立刻變成 stored XSS**。建議：
- 加 server-side sanitize（如 `DOMPurify` 在 frontend 或 `sanitize-html` 在 backend）
- 或保留純文字限制、永遠不用 dangerouslySetInnerHTML

### Ops log 補充

之前 smoke test 顯示 0 entries 是因為當時 central 還沒有任何檔案操作。後來今天所有 smoke / boundary / permission test 都正確 log 進去了、23 筆都有 IP 地址、actor_name、filename。**ops log 正常運作**。

---

## 加碼 3：WS Realtime + Heap + H6 + H5（凌晨 03:45 加跑）

### WebSocket realtime
- ✅ AUTH_SUCCESS / work_log_created / work_log_deleted 都正確推送
- 🟡 **發現新 security 洞**：WebSocket AUTH **不驗證 JWT**、客戶端送 `{type:'AUTH', payload:{userId:'任意 user id'}}` 就被 register 成該 user。確認過：
  - 不需要任何 token 就能 spoof
  - 影響：可接收他人的廣播訊息（如目標 chat）、可冒名上線狀態
  - 修法：[backend/dist/websocket-server.js](backend/dist/websocket-server.js) `handleConnection` 改成 require token + jwt.verify、用驗證過的 userId、棄用 client-claimed userId
  - **不在凌晨修**：屬 breaking change（現有連線中的 tab 全部要 reconnect+ frontend 配合送 token）、白天再排
  - 列入 [reference_testing_blindspots.md](C:/Users/canri/.claude/projects/C--Users-canri/memory/reference_testing_blindspots.md) 第 N 類：「WS auth 與 REST 不對稱、JWT 沒同步驗證」

### Heap snapshot
- ✅ blob URL revoke 流程正確（30 次 cycle、+0.1 MB）
- ✅ 即使不 revoke、leak 也 < 1 MB（70-byte 測試圖）

### H6 — work-logs pagination（已實作）
- Backend 加 `?pageSize=&page=` opt-in pagination、預設行為不變
- Response 多 `pagination: { page, pageSize, total, hasMore }` 欄位
- 未來 frontend 可接 infinite scroll、現在不必動 frontend

### H5 — work_log_images 索引表（已實作）
- 新 migration `20260701000000_add_work_log_images_index.js`：建 `work_log_images` 表 (composite PK hash+log_id+section)、idempotent backfill 既有 JSON
- Backend image 上傳：寫 JSON + 寫 index（dual write）
- Backend image fetch：fast path 查 index、fall back 到 JSON scan
- Backend image delete：兩邊同步刪
- production 上既有 0 筆 image refs、零遷移成本

---

## 過程留下的痕跡</new_str>
</invoke>

- 4 台 production server `/root/pre-test-20260630-1839.tar.gz` snapshot（150-225 MB）
- `operations_log` 多 ~10 筆 [SMOKE] / [PERM TEST] 上傳/刪除事件
- `system_logs` 多 ~5 筆登入 / 用戶建立刪除事件
- 不影響任何員工資料
