# PROJECT-KNOWLEDGE-BASE.md

## 項目概述
TaskFlow Pro 是一個企業內部的任務與溝通管理系統，包含後端 (Express/SQLite) 與前端 (React/Vite)。

## 核心技術棧
- **後端**: Node.js, Express, better-sqlite3 (加密資料庫)
- **前端**: React, TypeScript, Vite, Tailwind CSS
- **部署**: DigitalOcean (後端 Docker), Netlify (前端)

## UI 版本與源碼管理 (2026-01-01 更新)

### 1. 正確的「新版」UI 源碼
- **源碼備份**: `C:\Users\USER\Downloads\Backups\TaskFlow_Fixed_Final_20251230_180716.zip`
- **主要特徵**: 
    - 儀表板包含 **打卡組件 (AttendanceWidget)**、**每日任務清單**、**營運速報**（圖二樣式）。
    - 側邊欄分類完整，導覽列有招呼語「👋 早安」。
    - 使用 Vite 構建，配置檔案 (`tsconfig.json`, `vite.config.ts`) 必須正確。

### 2. 部署站點
- **主要**: [transcendent-basbousa-6df2d2.netlify.app](https://transcendent-basbousa-6df2d2.netlify.app)
- **備用**: [bejewelled-shortbread-a1aa30.netlify.app](https://bejewelled-shortbread-a1aa30.netlify.app)
- **站點 ID**: `5bb6a0c9-3186-4d11-b9be-07bdce7bf186` (transcendent)

### 3. 重要 UI 配置修復
- **Vite 配置**: 已手動恢復 `vite.config.ts` (React plugin, Manual Chunks)。
- **TS 配置**: 已恢復 `tsconfig.json` 與 `tsconfig.node.json` (React-JSX, References)。
- **Index.html**: 移除 garbled 字符，設置標題為「企業管理系統」，包含 Tailwind CDN。

## 重要修復記錄 (2025-12-30)

### 1. 聊天系統修復
- **問題**: 聊天列表為空、標記已讀 500 錯誤、離開群組 404 錯誤。
- **解決**: 
    - 補全 `/api/chat/channels/:channelId/leave` 路由。
    - 使用 `safeJsonParse` 處理資料庫中的 `participants` 和 `read_by` 欄位，防止 JSON 解析失敗。
    - 針對舊版本 SQLite 回退使用 `LIKE` 查詢配合記憶體中過濾（因不支持 `json_each`）。
    - 編輯群組時強制更新 `updated_at`，確保即時同步。
    - 收回訊息限制延長至 100 年（無限制）。

### 2. 通訊錄權限放開
- **問題**: 部門與角色限制導致用戶無法看到彼此。
- **解決**: 
    - 移除 `GET /api/users` 的角色限制，所有人皆可獲取全體用戶清單。
    - 移除 `GET /api/users/department/:departmentId` 的部門存取限制。
    - 移除 `GET /api/users/:id` 的權限檢查，允許查看所有用戶的基本資訊。

### 3. 前後端通訊 (Mixed Content)
- **問題**: HTTPS 前端請求 HTTP 後端報錯。
- **解決**: 
    - 配置 Netlify Proxy (`netlify.toml`) 將 `/api/*` 轉發至後端。
    - 前端 `.env.production` 設置 `VITE_API_URL=/api`。

### 4. 通訊與打卡系統終極修復 (V37.2) (2026-01-01)
- **問題**: 
    - 聊天系統報 500 錯誤 (`db.run is not a function`)。
    - 打卡系統因包含中文字符導致路由掛載失敗 (`SyntaxError: Invalid or unexpected token`)。
    - 用戶「無法打卡」，實際上是因為系統時區判斷混亂（UTC vs Local），導致將「今日」的未簽退紀錄誤判為「已打卡」。
- **解決**: 
    - **dbCall 適配器**: 實作 `dbCall` 輔助函數，自動相容 `SecureDatabase` (async) 與原始 `better-sqlite3`。
    - **ASCII Only**: 強制所有後端路由文件僅使用 ASCII 字符，中文訊息一律使用 Unicode Escape (如 `\u6253\u5361`)，徹底解決編碼崩潰問題。
    - **時區統一 (Taiwan Time)**: 在後端實作 `getTaiwanToday()`，強制使用 UTC+8 判斷「今天」，解決跨日與時區邏輯衝突。
    - **智能狀態重置**: `/status` API 加入邏輯，若發現用戶有「跨日未簽退」的舊紀錄，自動顯示為 `CLOCKED_IN` 狀態並允許簽退，避免卡死。
- **驗證**: 
    - 通過容器內 Node.js 模擬腳本 (`node /app/sup_verify.js`) 驗證了完整的「查看狀態 -> 簽退舊紀錄 -> 重新打卡 -> 再次簽退」流程。
    - 確認「測試人員主管」與「Seven」皆已恢復正常。

### 6. 系統備份 (2026-01-01)
- **版本**: v2.2.5
- **內容**: 完整後端代碼 (`/app/dist`) 與 資料庫 (`/app/data/taskflow.db`)
- **位置**: 
    - 容器內: `/app/data/backups/TaskFlow_Pro_v2.2.5_20260101.tar.gz`
- **操作**: 已驗證資料庫完整性與檔案大小。

### 9. 登入問題終極修復 (2026-01-03)
- **版本**: v8.9.6-login-fixed-final
- **問題**: 修改密碼功能導致系統無法登入，多次回滾失敗
- **根本原因**:
    1. CORS 配置只允許 localhost，不包含 Netlify 域名
    2. 後端只監聽 HTTPS，Netlify 無法驗證自簽名證書
    3. Docker 容器端口 3001 未映射到外部
- **解決方案**:
    - 修復 CORS 配置，添加 Netlify 域名
    - 添加 HTTP 伺服器監聽端口 3001（用於 Netlify 反向代理）
    - 重新創建容器，映射端口 3000 和 3001
    - 更新 `netlify.toml` 使用端口 3001
- **正確架構**:
    - 用戶 (HTTPS) → Netlify → HTTP:3001 → 後端
    - 直接訪問 (HTTPS) → HTTPS:3000 → 後端
- **快照**: `taskflow-snapshot-v8.9.6-login-fixed-final-20260103_131530.tar.gz`

### 10. 修改密碼功能實現 (2026-01-03)
- **版本**: v8.9.7-change-password-added
- **問題**: 修改密碼功能無法使用，前端有 UI 但後端缺少 API
- **位置**: 系統設定頁面左側邊欄「登出系統」按鈕上方
- **實現內容**:
    - 後端 API：`POST /api/users/:id/change-password`
    - 安全特性：身份驗證、權限檢查、密碼驗證、bcrypt 加密
    - 驗證規則：目前密碼正確、新密碼至少 4 字元
    - 操作日誌：記錄密碼修改操作
- **快照**: `taskflow-snapshot-v8.9.7-change-password-added-20260103_132621.tar.gz`

### 11. 穩定版本完整備份 (2026-01-03)
- **版本**: v8.9.7-stable-all-features
- **狀態**: ✅ 所有功能正常（除恢復原廠設定未測試）
- **備份位置**:
    - 遠端：`/root/taskflow-snapshots/taskflow-snapshot-v8.9.7-stable-all-features-20260103_133142.tar.gz`
    - 本機：`C:\Users\USER\Downloads\Backups\TaskFlow_v8.9.7_20260103\`
- **備份大小**: 213 MB (223,867,270 bytes)
- **備份類型**: 完整系統快照（Docker 映像 + 資料庫 + 配置）
- **已實現功能**:
    - ✅ 用戶管理、角色權限、部門管理
    - ✅ 任務管理、出勤打卡、財務管理
    - ✅ 報表中心、員工提案論壇
    - ✅ 聊天系統、公告系統
    - ✅ 登入功能（Netlify 反向代理）
    - ✅ 修改密碼功能
- **待測試**: 恢復原廠設定

---
最後修改日期: 2026-01-03
版本: 8.9.7 (穩定版本 - 所有功能完整)

### 7. 前端記憶體優化 (2026-01-01)
- **版本**: v2.2.6
- **問題**: 網站長時間運行後記憶體佔用過高，背景資源消耗大。
- **解決**:
    - **聊天系統**: 限制快取 (5 頻道)，背景輪詢降頻 (60s)。
    - **全局效能**: 背景時停止未讀計數輪詢。
    - **列表渲染**: 財務、報表、人員列表實作分頁與「載入更多」。
    - **儀表板**: 限制預設顯示任務數量。
    - **打卡組件**: 背景時暫停時鐘更新。
- **備份**: `C:\Users\USER\Downloads\Backups\CompanyProject_Memory_Optimization_20260101.zip`
- **詳細日誌**: `MEMORY-OPTIMIZATION-LOG.md`

### 8. 部門數據與打卡歷史修復 (V37.3) (2026-01-01, 再次修復 2026-01-02)
- **版本**: 後端 V37.3
- **問題**: 「部門數據」頁面無法顯示出勤紀錄，因為後端缺少獲取歷史紀錄的 API。
- **解決**: 
    - 補回 `GET /api/attendance` 路由。
    - 實作歷史紀錄查詢，預設回傳最近 3 個月的數據以保護效能。
    - 確保 `authenticateToken` 中間件正確套用。
- **2026-01-02 再次修復**: 
    - 問題重現：容器內 attendance.js 在某次修復後損壞，缺少 GET / 路由
    - 使用本地 `attendance-v37-3.js` (Pure ASCII) 恢復
    - 最終映像：`taskflow-pro:v3.9.0-attendance-v37-restored`
    - 教訓：先查記憶倉庫，使用 `Get-Content | ssh` 上傳文件避免 PowerShell 引號問題

