# 新對話框提示詞

請將以下內容複製到新對話框：

---

## 專案背景

我正在開發 **TaskFlow Pro** 企業管理系統，這是一個部署在 DigitalOcean 的 Docker 容器化應用。

**技術棧**：
- 後端：Node.js + TypeScript + SQLite
- 前端：React + TypeScript + Vite
- 部署：Docker + Netlify
- 伺服器：165.227.147.40

**部署方式**：
- 後端：Docker 容器 `taskflow-pro`
- 前端：Netlify 部署
- 資料庫：SQLite (`/app/data/taskflow.db`)
- 上傳腳本：使用 `Get-Content | ssh` 管道

---

## 當前系統狀態（台灣時間 2026-01-29 18:56）

### 版本資訊
- **當前版本**：`taskflow-pro:v8.9.183-service-layer`
- **最新快照**：`taskflow-snapshot-v8.9.183-before-users-refactor-20260129_103805.tar.gz` (238MB)
- **狀態**：✅ 穩定運行

### 已完成的工作

1. **備份系統改善** ✅
   - 備份頻率：從 6 小時改為 1 小時
   - 手動觸發：`/root/trigger-backup.sh`
   - 風險降低：83%

2. **服務層架構建立** ✅
   - 創建 `/app/services/` 目錄
   - `UserService`：完整 CRUD 功能（getAllUsers, getUserById, createUser, updateUser, deleteUser）
   - `AttendanceService`：打卡系統服務層
   - `WorkLogService`：工作報表服務層
   - 所有服務測試通過

3. **問題診斷和解決方案** ✅
   - 快照恢復缺失問題 → 創建完整快照腳本
   - 回歸測試問題 → 測試檢查清單
   - 代碼耦合度高 → 解耦合指南
   - API 路由重構 → 完整計劃

4. **文檔創建** ✅
   - `BACKUP-IMPROVEMENT-IMPLEMENTED.md` - 備份改善報告
   - `SNAPSHOT-PROBLEM-ANALYSIS.md` - 快照問題分析
   - `DEPLOYMENT-CHECKLIST.md` - 部署檢查清單
   - `REGRESSION-TEST-SOLUTION.md` - 回歸測試方案
   - `CODE-DECOUPLING-GUIDE.md` - 代碼解耦合指南
   - `API-REFACTORING-PLAN.md` - API 重構計劃

---

## 正在進行的工作

### API 路由重構（進行中）

**目標**：將 API 路由從直接操作資料庫改為使用服務層，降低代碼耦合度。

**當前進度**：
- ✅ 服務層基礎架構已建立
- ✅ UserService 已擴展（完整 CRUD）
- ✅ 快照已創建（重構前）
- ✅ 原始文件已備份（`/app/dist/routes/users.js.before-refactor`）
- ⏳ **下一步**：重構用戶管理 API 路由

**重構計劃**：
1. **第一階段（本週）**：
   - 用戶管理 API (`/api/users`)
   - 打卡系統 API (`/api/attendance`)
   - 工作報表 API (`/api/work-logs`)

2. **第二階段（下週）**：
   - 公告系統、任務管理、報表中心等

**重構原則**：
- 小步重構（一次一個路由文件）
- 保持功能一致（只改結構，不改功能）
- 充分測試（測試所有端點）
- 及時提交（測試通過立即提交）

---

## 重要設定和規則

### 時區設定
- ✅ **專案使用台灣時間（UTC+8）**
- 所有時間相關的操作、日誌、記錄都使用台灣時間

### 部署流程（核心規則）
1. 創建快照（修改前）
2. 備份原始文件
3. 進行修改
4. 測試驗證
5. 如果成功：`docker commit` → 創建新映像 → 創建快照
6. 如果失敗：恢復備份 → 分析問題

### 關鍵教訓
1. **使用容器內 Node.js 腳本** - 避免 PowerShell 引號問題
2. **精確修改而非重寫** - 使用小腳本精確替換，避免破壞其他功能
3. **備份和快速回復** - 修改前創建快照，保留穩定映像
4. **逐步驗證** - 修復一個功能，測試一個功能
5. **使用 Get-Content | ssh 管道上傳文件** - 唯一可靠的方法

---

## 可用的工具和腳本

### 備份和快照
- `/root/trigger-backup.sh` - 手動觸發備份
- `/root/create-snapshot.sh` - 創建快照
- `/root/create-complete-snapshot.sh` - 創建完整快照（有語法錯誤，使用上面的）

### 服務層
- `/app/services/userService.js` - 用戶管理服務
- `/app/services/attendanceService.js` - 打卡系統服務
- `/app/services/workLogService.js` - 工作報表服務
- `/app/services/index.js` - 服務層統一入口

### 測試腳本
- `/app/test-services.js` - 測試服務層
- `/app/test-userservice.js` - 測試 UserService

---

## 回退方法

如果需要回退到之前的版本：

```bash
# 回退到服務層建立前
ssh root@165.227.147.40 "docker stop taskflow-pro && docker rm taskflow-pro"
ssh root@165.227.147.40 "docker run -d --name taskflow-pro -p 3000:3000 -p 3001:3001 -e PORT=3000 -v /root/taskflow-data:/app/data taskflow-pro:v8.9.182-remove-employee-delete"

# 回退到當前版本（服務層已建立）
ssh root@165.227.147.40 "docker stop taskflow-pro && docker rm taskflow-pro"
ssh root@165.227.147.40 "docker run -d --name taskflow-pro -p 3000:3000 -p 3001:3001 -e PORT=3000 -v /root/taskflow-data:/app/data taskflow-pro:v8.9.183-service-layer"
```

---

## 下一步工作

### 立即要做的（用戶管理 API 重構）

1. **分析現有用戶路由**
   - 文件：`/app/dist/routes/users.js` (21KB)
   - 包含：認證、授權、密碼處理等複雜邏輯
   - 使用：`req.db` 訪問資料庫

2. **創建重構腳本**
   - 保留認證和授權邏輯
   - 只替換資料庫操作為服務層調用
   - 使用精確的字串替換

3. **測試驗證**
   - 測試所有用戶 API 端點
   - 測試前端用戶功能
   - 確保功能完全一致

4. **提交新版本**
   - `docker commit` 創建新映像
   - 創建快照
   - 更新版本記錄

---

## 用戶偏好

- 希望 AI 自動執行並測試
- 遇到問題時自動回退
- 使用台灣時間
- 詳細記錄所有變更

---

## 問題摘要

請幫我繼續完成用戶管理 API 的重構工作。我們已經：
- ✅ 建立了服務層架構
- ✅ 擴展了 UserService
- ✅ 創建了快照和備份

現在需要：
- 重構 `/app/dist/routes/users.js` 使用服務層
- 測試所有用戶 API 端點
- 如果測試通過則提交新版本
- 如果測試失敗則自動回退

請按照上述的部署流程和重構原則進行。
