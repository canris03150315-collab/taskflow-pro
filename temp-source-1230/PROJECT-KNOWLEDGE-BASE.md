# PROJECT-KNOWLEDGE-BASE.md

## 項目概述
TaskFlow Pro 是一個企業內部的任務與溝通管理系統，包含後端 (Express/SQLite) 與前端 (React/Vite)。

## 核心技術棧
- **後端**: Node.js, Express, better-sqlite3 (加密資料庫)
- **前端**: React, TypeScript, Vite, Tailwind CSS
- **部署**: DigitalOcean (後端 Docker), Netlify (前端)

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

## 操作規範
- **不要編譯 TypeScript**: 直接修改編譯後的 JavaScript 文件以繞過編譯問題。
- **不要使用 PowerShell 的 &&**: 改用分號 `;`。
- **修改前備份**: 使用 `cp /app/data/taskflow.db /app/data/taskflow.db.backup_...` 備份資料庫。

---
最後修改日期: 2025-12-30
版本: 2.1.0
