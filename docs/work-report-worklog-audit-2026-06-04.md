# 工作報表 + 工作日誌 全面檢查報告 — 2026-06-04

**方法**：3 個並行 Explore agent（backend 安全、工作報表 UI、工作日誌 UI）+ Node smoke test 跑 central production。

**Live smoke test 結果**（central.wuk-on.com）：

| 流程 | 狀態 |
|------|------|
| 登入 BOSS | ✅ |
| 上傳文字檔 | ✅ |
| 取檔案明細 | ✅ |
| 預覽文字（回 unsupported） | ✅ |
| 上傳圖片 | ✅ |
| **圖片預覽 byte-identical**（剛上線的 836fefa） | ✅ |
| 下載 / 軟刪除 / 還原 / 垃圾桶 / 操作日誌 | ✅ |
| 工作日誌 CRUD（create / update / 上傳圖片 / hydrate / 下載 / 刪圖 / 刪日誌） | ✅ |

**結論：核心流程全綠**、但 audit 找到 4 個🔴 + 11 個🟡 + 10 個🟢 等級的問題、值得分批修。

---

## 🔴 CRITICAL（影響資料安全或員工卡關、應優先修）

### C1. files.js DELETE/restore version 缺檔案層權限檢查（安全洞）
**位置**：`backend/dist/routes/files.js:194-244`
**症狀**：員工 A 若曾上傳過共享檔案的某一版本、可以刪除/還原該檔案的**任何其他版本**。
**Root cause**：DELETE/restore 只呼叫 `canDeleteVersion(user, version)` 檢查 uploader_id、沒檢查 `canViewFile` 確認對檔案的存取權。
**修法**：兩個 endpoint 開頭加 `await req.db.get('SELECT * FROM files WHERE id = ?')` + `perms.canViewFile(user, file)` 檢查。

### C2. fileStorage.readBlob 無錯誤處理、blob 遺失會 500 + 訊息不清
**位置**：`backend/dist/services/fileStorage.js:38-41`
**症狀**：若 DB row 有但 disk blob 不存在（例如備份還原後不一致）、`fs.readFileSync` 直接 throw、員工看「下載失敗」沒線索、log 也沒寫 blob_path。
**修法**：`readBlob` 加 null 檢查 + `fs.existsSync` 預檢 + 拋具體 message；route 端 log 印 blob_path。

### C3. WorkLogTab 主管看得到「刪除」按鈕、後端拒收
**位置**：`backend/dist/routes/work-logs.js:313` vs `components/WorkLogTab.tsx:424-435`
**症狀**：主管在 WorkLogTab 看到員工日誌的「刪除」按鈕、按下去 403「只能刪除自己的工作日誌」。
**Root cause**：前端 `(isOwner || isManager)` 開放、後端只允許 `user_id === currentUser.id`。
**修法**：選一個 — 後端開放 `(currentUser.id === existing.user_id || isManager)`、或前端用 `isOwner` only。建議後端開放（讓主管能清測試資料）。

### C4. 工作日誌新建時批次上傳圖片、modal 中途關閉 → blob URL 漏 + 沒進度顯示
**位置**：`components/WorkLogTab.tsx:176-216`
**症狀**：員工新增日誌附 10 張圖、按 ESC / 點背景關閉 → 上傳中的 File 物件沒 cleanup、blob URL 累積在 memory。同時 10 張連續上傳完全沒進度顯示、慢網路會像 app 卡死。
**修法**：(a) `useEffect` cleanup 在 modal `isModalOpen=false` 時呼叫 `clearPendingImages()` + revoke URLs。(b) loop 上傳時 setState 顯示「上傳 3/10…」。

---

## 🟡 HIGH（會踩到員工但不致命、本週內修）

### H1. ExcelPreview 下載失敗訊息被吞
**位置**：`components/files/ExcelPreview.tsx:107-109`
**症狀**：預覽 modal 內按下載、若 API 失敗、`catch { /* toast handled elsewhere */ }` 但其實沒地方 toast。員工會以為按了沒反應。
**修法**：`catch (e) { toast.error(e.message || '下載失敗'); }`

### H2. CompanyFilesTab manager bypass（前端 only）
**位置**：`components/files/CompanyFilesTab.tsx:29-48`
**症狀**：員工若直接 URL 進到 CompanyFilesTab，前端的 `isManager` 只影響顯示文字、API 仍會回 company 範圍檔案。**需 backend 驗證**。
**修法**：backend `GET /files?scope=company` 需檢查 role >= MANAGER；前端再加 early-return 顯示 EmptyState。

### H3. ExcelPreview「新分頁」Excel HTML blob URL 30 秒就 revoke
**位置**：`components/files/ExcelPreview.tsx:211`
**症狀**：慢網路上、使用者切去新分頁前 URL 已失效、頁面變空白。
**修法**：拉長 timeout 至 5 分鐘、或改用 data: URI、或不要主動 revoke（讓 tab close 時 GC）。

### H4. files.js 上傳信任 client mime_type（可偽造）
**位置**：`backend/dist/routes/files.js:54-56`
**症狀**：員工上傳 `.exe` 改 Content-Type 為 `image/jpeg` 過了 ALLOWED_MIME 檢查、之後預覽時被當圖檔回傳、有 XSS / drive-by 風險。
**修法**：用 `file-type` 套件從 buffer 偵測真實 mime、覆蓋 `req.file.mimetype`。

### H5. work-logs.js 影像存取 O(n) 全表掃描
**位置**：`backend/dist/routes/work-logs.js:395-409`
**症狀**：每張圖片 fetch 都 `SELECT * FROM work_logs WHERE images IS NOT NULL` 全表 + JSON.parse 找 hash。員工數+日誌數一多會慢成龜爬。
**修法**：建一張 `work_log_images(hash PRIMARY KEY, work_log_id, section, ...)` 反向索引表、上傳/刪除時同步維護。

### H6. work-logs 列表無分頁
**位置**：`backend/dist/routes/work-logs.js:56-100` + `services/api.ts` workLogs.getAll
**症狀**：`getAll()` 載入所有日誌（無 LIMIT）。1000+ 筆會 freeze DOM、mobile crash。
**修法**：backend 加 `LIMIT 50 OFFSET ?`、前端加「載入更多」或 infinite scroll。

### H7. 工作日誌缺後端字數驗證
**位置**：`components/WorkLogTab.tsx:560` 有紅色計數提示但 textarea 無 `maxLength`、backend 也無檢查
**症狀**：員工貼 5000 字 → backend 接受 → 顯示時破版面
**修法**：textarea 加 `maxLength={500}`、後端加 length check + 400 error

### H8. 工作日誌 ImageUploader 批次失敗訊息混亂
**位置**：`components/files/ImageUploader.tsx:52-68`
**症狀**：10 張圖、第 8 張上傳失敗 → toast 顯示但 UI 看到 7 張、員工以為都成功。
**修法**：失敗時清楚顯示「圖 8 失敗 (檔名)」、或失敗時 block submit。

### H9. ExcelPreview blob URL 切檔案不 revoke
**位置**：`components/files/ExcelPreview.tsx:84-89`
**症狀**：cleanup 在 unmount 才跑、如果用同個 modal 切到不同檔案、舊 URL 累積。
**修法**：useEffect 的 deps 加 `[fileId, versionNo]` 讓切檔案時 revoke。

### H10. VersionList 下載錯誤可能被 modal 遮住
**位置**：`components/files/VersionList.tsx:50-53`
**症狀**：toast 跳出但 VersionList 還開著、可能看不到。
**修法**：toast 改 sticky 或關閉 modal 後 toast。

### H11. UploadModal 同名自動覆蓋無視覺確認
**位置**：`components/files/UploadModal.tsx:35-40`
**症狀**：同檔名 same-user_match 時直接上傳新版、toast 飛過、員工不知道。
**修法**：先 confirm dialog「將上傳為 v2、確定？」

---

## 🟢 MEDIUM（polish）

### M1. 行動裝置 ImageUploader 沒開相機 capture
- `accept="image/jpeg,..."` 不會在手機觸發相機。改 `accept="image/*"` + 可選 `capture="environment"` 讓員工拍現場照片更順。

### M2. 工作日誌 ESC 關 modal 沒確認 unsaved
- 員工打字 5 分鐘按 ESC 直接消失。建議：modal close 前 check formData dirty 跳確認。

### M3. 主管不能幫員工補附件
- backend `work-logs.js:351` 只允許作者上傳圖。主管想幫員工補收據 / 證據時被擋。建議改 `if (log.user_id !== currentUser.id && !isManager)`。

### M4. WorkLogTab 新建流程的縮圖預覽用 `window.open` 不是 lightbox
- 跟編輯流程不一致。建議用 ImageLightbox + 暫構造臨時 image array。

### M5. files.js preview 無 size limit（PDF / image）
- 100MB PDF 直接讀進 memory + 傳給 browser、會慢/爆 mem。建議 PDF >50MB、image >20MB 回 oversized。

### M6. TrashView remainingHours 邊界 case
- 48h 整時間點顯示「剩 0 小時」但檔案還在。建議定期 refresh 或 server-side 排程清。

### M7. FileListItem 連點兩次展開可能 race
- 並行 getDetail 後者覆蓋前者。修法：detailLoading state guard。

### M8. ImageLightbox 圖載入失敗無錯誤狀態
- 加 `onError` 顯示「圖片載入失敗」訊息。

### M9. OperationsLogTab 無分頁
- 1000+ 筆 ops 會卡。

### M10. `specialNotes` vs `notes` 命名不一致
- WorkLogTab 用 `notes`、WorkLogView 用 `specialNotes`。API adapter 容忍但讓後人困惑。建議統一 `notes`。

---

## 🔵 IDEAS（未來考慮）

- Operations log 預期會記錄每次 upload/delete、但 smoke test 顯示 0 entries — 可能 BOSS 角色看到的是 filtered view、或 logging 沒寫對、值得查
- 圖片 EXIF 脫敏（含 GPS / 拍攝時間）
- 同 section 並行上傳同 hash 沒 UNIQUE 防護
- Backup 整合 — file blobs 已包進 tar.gz、但 orphan blob（DB row 刪了但 blob 留）沒清理機制
- Manager 用 SUPERVISOR 角色檢視員工 blog — backend 部分權限模式不對稱

---

## 修法分階段建議

### Phase 1 — Critical 安全 + 卡關（建議本週做）
- C1（檔案版本權限）+ C2（blob 錯誤處理）+ C3（主管刪除前後端對齊）+ C4（image upload cleanup + 進度顯示）

### Phase 2 — High UX（接續本週）
- H1 / H2 / H3 / H4 / H6 / H7 / H8（用戶端會踩到的）

### Phase 3 — Polish + 效能（下週後）
- H5（O(n) → 索引表、改 schema、需 migration）
- H9 / H10 / H11 + 所有 Medium

### Phase 4 — IDEAS（未來）
- Operations log 驗證
- EXIF 脫敏
- 反向索引 + 分頁

---

要不要從 Phase 1 開始？要的話我把 4 個 critical 都修了再批次 deploy。
