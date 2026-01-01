# TaskFlow Pro - API 端點對照表

## ✅ 已確認對接的端點

### 1. Authentication (auth)
- ✅ `POST /auth/login` - 登入
- ✅ `POST /auth/setup` - 初始化設置（創建管理員）
- ✅ `GET /auth/setup/check` - 檢查是否需要初始化
- ✅ `POST /auth/verify` - 驗證 token
- ✅ `POST /auth/change-password` - 修改密碼

### 2. Users (users)
- ✅ `GET /users` - 獲取所有用戶
- ✅ `GET /users/:id` - 獲取單個用戶
- ✅ `POST /users` - 創建用戶
- ✅ `PUT /users/:id` - 更新用戶
- ✅ `DELETE /users/:id` - 刪除用戶
- ✅ `POST /users/:id/reset-password` - 重置密碼
- ✅ `GET /users/department/:departmentId` - 獲取部門用戶

### 3. Departments (departments)
- ✅ `GET /departments` - 獲取所有部門
- ✅ `GET /departments/:id` - 獲取單個部門
- ✅ `POST /departments` - 創建部門
- ✅ `PUT /departments/:id` - 更新部門
- ✅ `DELETE /departments/:id` - 刪除部門
- ✅ `GET /departments/:id/tasks` - 獲取部門任務
- ✅ `GET /departments/:id/members` - 獲取部門成員

### 4. Tasks (tasks)
- ✅ `GET /tasks` - 獲取所有任務
- ✅ `GET /tasks/:id` - 獲取單個任務
- ✅ `POST /tasks` - 創建任務
- ✅ `PUT /tasks/:id` - 更新任務
- ✅ `PATCH /tasks/:id` - 部分更新任務（前端使用 updateProgress）
- ✅ `POST /tasks/:id/accept` - 接受任務
- ✅ `POST /tasks/:id/complete` - 完成任務
- ✅ `GET /tasks/:id/timeline` - 獲取任務時間線
- ✅ `GET /tasks/sync/queue` - 同步隊列

### 5. Attendance (attendance)
- ✅ `GET /attendance` - 獲取考勤記錄
- ✅ `GET /attendance/today?userId=xxx` - 獲取今日狀態（前端使用）
- ✅ `GET /attendance/history` - 獲取歷史記錄（前端使用）
- ✅ `POST /attendance/clock-in` - 打卡上班
- ✅ `POST /attendance/clock-out` - 打卡下班
- ✅ `GET /attendance/status` - 獲取狀態
- ✅ `GET /attendance/summary` - 獲取摘要
- ✅ `POST /attendance/sync-offline` - 同步離線數據

### 6. Performance (performance)
- ✅ `GET /performance/reviews?period=xxx&userId=xxx` - 獲取績效評估
- ✅ `GET /performance/stats?userId=xxx&period=xxx` - 獲取用戶統計
- ✅ `POST /performance/reviews` - 保存評估

## ⚠️ 需要確認的端點

以下端點在前端有定義，但後端路由文件檢查時沒有顯示（可能需要檢查）：

### 7. Announcements (announcements)
- 前端：`GET /announcements`
- 前端：`POST /announcements`
- 前端：`POST /announcements/:id/read`

### 8. Reports (reports)
- 前端：`GET /reports`
- 前端：`POST /reports`

### 9. Finance (finance)
- 前端：`GET /finance`
- 前端：`POST /finance`
- 前端：`POST /finance/:id/confirm`
- 前端：`DELETE /finance/:id`

### 10. Forum (forum)
- 前端：`GET /forum`
- 前端：`POST /forum`
- 前端：`PUT /forum/:id`

### 11. Memos (memos)
- 前端：`GET /memos?userId=xxx`
- 前端：`POST /memos`
- 前端：`PUT /memos/:id`
- 前端：`DELETE /memos/:id`

### 12. Routines (routines)
- 前端：`GET /routines/templates`
- 前端：`POST /routines/templates`
- 前端：`DELETE /routines/templates/:id`
- 前端：`POST /routines/templates/:id/read`
- 前端：`GET /routines/today?userId=xxx&deptId=xxx`
- 前端：`GET /routines/history`
- 前端：`POST /routines/records/:id/toggle`

### 13. Chat (chat)
- 前端：`GET /chat/channels?userId=xxx`
- 前端：`GET /chat/channels/:id/messages`
- 前端：`POST /chat/channels/:id/messages`
- 前端：`POST /chat/channels/:id/read`
- 前端：`POST /chat/channels/direct`

### 14. System (system)
- 前端：`POST /system/reset`
- 前端：`GET /system/export`
- 前端：`POST /system/import`
- 前端：`GET /system/settings`
- 前端：`POST /system/settings`

### 15. Logs (logs)
- 前端：`GET /logs`

## 📝 注意事項

1. **所有需要認證的端點**都需要在 header 中包含 `Authorization: Bearer <token>`
2. **API 基礎路徑**：`/api`（通過 Netlify 代理）
3. **後端實際路徑**：`http://165.227.147.40/api`
4. **前端使用相對路徑**：`/api`（會自動通過 Netlify HTTPS 代理）

## 🚀 下一步

1. 測試創建管理員帳號功能
2. 測試主要功能（用戶管理、任務管理等）
3. 確認所有 API 端點都正常工作
