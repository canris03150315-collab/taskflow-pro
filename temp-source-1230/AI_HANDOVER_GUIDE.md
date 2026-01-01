
# TaskFlow Pro - 後端開發交接指引 (Backend Handover Guide)

## 1. 專案概況
**TaskFlow Pro** 是一套企業級內部的任務、報表、通訊與績效管理系統。前端已完全開發完畢，目前正處於從 Mock API (LocalStorage) 轉向真實後端 API 的開發階段。

## 2. 啟動與初始化流程 (First-Run Setup)
為了確保系統安全性，前端實作了「初次設定模式」。
*   **觸發條件**：前端調用 `GET /api/users`，若回傳陣列長度為 0。
*   **行為**：導向 `SetupPage`，呼叫 `POST /api/auth/setup`。
*   **後端職責**：實作 `POST /api/auth/setup`，接收第一個管理員資料並存入資料庫，隨後鎖定此接口，防止重複初始化。

## 3. 核心 API 規範 (The API Contract)
所有請求應帶入 `Authorization: Bearer <JWT_TOKEN>` Header。

### 認證與權限 (`/api/auth`)
- `POST /login`: 驗證帳號密碼，回傳 `User` 物件與 `token`。
- `POST /setup`: 初次建立最高管理員。

### 使用者管理 (`/api/users`)
- `GET /`: 列出所有使用者。
- `POST /`: 新增員工。
- `PUT /:id`: 更新資料。
    - **權限限制**：員工僅能修改自己的 `name`, `avatar`, `password`；主管/老闆可修改所有人的所有欄位。
- `DELETE /:id`: 刪除帳號。

### 任務系統 (`/api/tasks`)
- `GET /`: 獲取所有任務。
- `POST /`: 建立任務。
- `PATCH /:id`: 部分更新（例如進度更新、封存狀態）。

### 出勤與打卡 (`/api/attendance`)
- `GET /today?userId=:id`: 獲取該員「最新一筆未簽退」紀錄，或今日紀錄。
- `POST /clock-in`: 建立新的上班紀錄。
- `POST /clock-out`: 更新指定紀錄的 `clockOut` 時間，並計算 `durationMinutes`。

### 通訊系統 (`/api/chat`)
- `GET /channels?userId=:id`: 獲取使用者參與的所有頻道清單（含未讀數）。
- `GET /channels/:id/messages`: 獲取訊息歷史。
- `POST /channels/:id/messages`: 發送訊息。
- **建議**：目前前端使用輪詢 (Polling)，未來建議後端支援 **WebSocket (Socket.io)** 以達成即時通訊。

### 系統審計 (Audit Log)
*   **關鍵要求**：後端在處理 `DELETE` (任何資源) 或 `UPDATE` (敏感欄位) 時，必須自動寫入一筆紀錄到 `SystemLog` 表。
*   `GET /api/logs`: 供管理員查看操作日誌。

## 4. 資料模型注意事項
*   **附件處理**：目前前端將圖片（頭像、報銷憑證）轉換為 **Base64 字串** 傳遞。後端可直接存入 Blob 或轉存雲端空間。
*   **日期格式**：統一使用 **ISO 8601** (例如 `2023-10-27T10:00:00.000Z`)。
*   **權限檢核**：前端雖有 UI 遮罩，但後端必須在每個 Controller 再次檢核 `User.role` 或 `User.permissions`。

## 5. 如何開始
1.  參考 `types.ts` 建立資料庫 Schema。
2.  將 `services/api.ts` 中的 `USE_MOCK_API` 改為 `false`。
3.  設定 `API_BASE_URL` 指向您的後端伺服器。
