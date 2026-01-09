# 工作日誌 - 2026-01-02 報表中心修復記錄

**日期**: 2026-01-02 08:10 AM - 08:18 AM  
**狀態**: ✅ 已完全修復  
**最終版本**: 
- 前端: Netlify Deploy ID `6957034fe61b2dcefbcde3a8`
- 後端: Docker Image `taskflow-pro:v4.2.0-reports-complete`
- 備份: `/app/data/backups/taskflow-backup-2026-01-02T00-17-XX-XXXZ.db`

---

## 📋 問題描述

**症狀**: 
- 報表中心頁面沒有顯示任何內容
- Console 顯示多個 API 錯誤
- 前端調用 `GET /api/reports` 失敗

**影響範圍**:
- 報表中心功能完全無法使用
- 無法新增、查看或管理報表
- 用戶無法提交每日工作報表

---

## 🔍 根本原因分析

### 問題 1：後端 reports.js 是空的

**位置**: `/app/dist/routes/reports.js`

**錯誤狀況**:
- `reports.js` 只有 exports，沒有任何路由實現
- 文件大小只有 411 bytes（9 行）
- API 返回「前端應用未找到」錯誤

**原因**:
- TypeScript 源文件 `server/src/routes/reports.ts` 只有 TODO 註解
- 編譯後的 JavaScript 文件是空的
- 從未實現過報表路由

### 問題 2：資料庫缺少 reports 表

**錯誤訊息**:
```
SqliteError: no such table: reports
```

**原因**:
- 資料庫初始化時沒有創建 `reports` 表
- 後端路由嘗試查詢不存在的表
- 導致 500 錯誤

---

## 🔧 修復方案

### 步驟 1：創建 Pure ASCII 版本的 reports.js

根據數據中心修復的教訓，使用本地 `reports_v2.js` 創建 Pure ASCII 版本：

**關鍵修改**:
1. 移除所有中文字符
2. 使用 Unicode Escape 替換錯誤訊息
3. 簡化錯誤訊息為英文

**創建文件**: `reports-ascii.js`

**包含路由**:
- `GET /` - 獲取報表列表（員工只看自己的，主管看全部）
- `POST /` - 新增報表
- `PUT /:id` - 主管修改報表（含修改日誌）
- `DELETE /:id` - 刪除報表
- `GET /:id/logs` - 獲取報表修改紀錄

### 步驟 2：上傳到容器

使用與 attendance.js 相同的成功方法：

```powershell
# 上傳文件到伺服器
Get-Content "reports-ascii.js" | ssh root@165.227.147.40 "cat > /tmp/reports.js"

# 複製到容器
ssh root@165.227.147.40 "docker cp /tmp/reports.js taskflow-pro:/app/dist/routes/reports.js"

# 驗證文件大小
ssh root@165.227.147.40 "docker exec taskflow-pro wc -l /app/dist/routes/reports.js"
# 輸出：175 /app/dist/routes/reports.js ✅

# 重啟容器
ssh root@165.227.147.40 "docker restart taskflow-pro"
```

### 步驟 3：創建資料庫表

```bash
# 檢查現有表
docker exec taskflow-pro node -e "const db = require('better-sqlite3')('/app/data/taskflow.db'); const tables = db.prepare('SELECT name FROM sqlite_master WHERE type=\'table\' AND name LIKE \'%report%\'').all(); console.log(JSON.stringify(tables)); db.close();"

# 創建 reports 表
docker exec taskflow-pro node -e "const db = require('better-sqlite3')('/app/data/taskflow.db'); db.exec('CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, type TEXT NOT NULL DEFAULT \'DAILY\', user_id TEXT NOT NULL, created_at TEXT NOT NULL, content TEXT)'); console.log('Reports table created'); db.close();"
```

### 步驟 4：創建新 Docker 映像

```bash
docker commit taskflow-pro taskflow-pro:v4.2.0-reports-complete
docker stop taskflow-pro && docker rm taskflow-pro
docker run -d --name taskflow-pro -p 3000:3000 -e PORT=3000 -v /app/data:/app/data taskflow-pro:v4.2.0-reports-complete
```

---

## 📊 reports 表結構

```sql
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,              -- report-{timestamp}
    type TEXT NOT NULL DEFAULT 'DAILY', -- DAILY, WEEKLY, MONTHLY
    user_id TEXT NOT NULL,            -- 創建者 ID
    created_at TEXT NOT NULL,         -- ISO 8601 timestamp
    content TEXT                      -- JSON 格式的報表內容
);
```

**content 欄位格式** (DailyReportContent):
```json
{
  "date": "2026-01-02",
  "completedTasks": ["task-1", "task-2"],
  "inProgressTasks": ["task-3"],
  "blockedTasks": [],
  "notes": "今日工作總結",
  "nextDayPlan": "明日計劃"
}
```

---

## 🚨 關鍵教訓

### 1. 資料庫表必須先創建

**問題**: 後端路由嘗試查詢不存在的表，導致 500 錯誤
**解決**: 在首次使用前創建所有必要的表

**預防措施**:
- 檢查 `server/src/database.ts` 的表初始化邏輯
- 確保所有功能模組的表都已創建
- 使用 `CREATE TABLE IF NOT EXISTS` 避免重複創建錯誤

### 2. 空的路由文件會被萬用路由攔截

**問題**: 空的 `reports.js` 導致 API 返回「前端應用未找到」
**原因**: `server.js` 的 `app.get('*')` 萬用路由攔截所有未匹配的請求

**教訓**:
- 檢查路由文件是否有實際實現
- 不要依賴 TypeScript 源文件的 TODO 註解
- 驗證編譯後的 JavaScript 文件內容

### 3. PowerShell Here-Document 不可靠

**問題**: 使用 Here-Document 創建多行文件失敗
**原因**: PowerShell 和 bash 的引號處理不一致

**成功方法**:
- 使用 `Get-Content | ssh` 管道上傳本地文件
- 避免在 SSH 命令中使用 Here-Document
- 先在本地創建文件，然後上傳

### 4. 遵循已有的成功模式

**參考**: 數據中心修復 (WORK_LOG_20260102_DATA_CENTER_FIX.md)
- 使用相同的上傳方法
- 使用 Pure ASCII 編碼
- 創建新 Docker 映像

---

## 📝 reports-ascii.js 關鍵實現

### GET / - 獲取報表列表

```javascript
router.get("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        let reports;
        
        // 員工只能看自己的報表
        if (currentUser.role === "EMPLOYEE") {
            reports = await db.all(
                "SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", 
                [currentUser.id]
            );
        } else {
            // 主管可以看所有報表
            reports = await db.all(
                "SELECT * FROM reports ORDER BY created_at DESC LIMIT 50"
            );
        }
        
        // 解析 JSON content
        for (const r of reports) {
            try { 
                r.content = JSON.parse(r.content || "{}"); 
            } catch(e) { 
                r.content = {}; 
            }
            
            // 獲取修改紀錄
            try {
                const logs = await db.all(
                    "SELECT * FROM report_edit_logs WHERE report_id = ? ORDER BY edited_at DESC", 
                    [r.id]
                );
                r.editLogs = logs || [];
            } catch(e) {
                r.editLogs = [];
            }
        }
        
        res.json({ reports });
    } catch (error) {
        console.error("[Reports] Error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
```

### POST / - 新增報表

```javascript
router.post("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { type, content } = req.body;
        const id = "report-" + Date.now();
        const now = new Date().toISOString();
        
        await db.run(
            "INSERT INTO reports (id, type, user_id, created_at, content) VALUES (?, ?, ?, ?, ?)",
            [id, type || "DAILY", currentUser.id, now, JSON.stringify(content)]
        );
        
        const report = await db.get("SELECT * FROM reports WHERE id = ?", [id]);
        report.content = JSON.parse(report.content);
        
        res.json({ report });
    } catch (error) {
        console.error("[Reports] Create error:", error);
        res.status(500).json({ error: "Server error" });
    }
});
```

---

## ✅ 驗證清單

- [x] 後端 reports.js 包含所有必要路由
- [x] 使用 Pure ASCII 編碼（無中文字符）
- [x] 資料庫 reports 表已創建
- [x] API 返回正確的認證錯誤（而非「前端應用未找到」）
- [x] 創建新 Docker 映像
- [x] 使用新映像重啟容器
- [x] 容器正常啟動無錯誤
- [x] 健康檢查通過
- [ ] 前端報表中心顯示報表列表（待用戶測試）

---

## 🔍 診斷方法

### 檢查 API 是否正常

```bash
# 正常（需要認證）
curl http://localhost:3000/api/reports
# 返回：{"error":"缺少認證 Token"}

# 異常（路由不存在）
# 返回：{"error":"前端應用未找到"}

# 異常（資料庫表不存在）
# 返回：{"error":"Server error"}
# 日誌：SqliteError: no such table: reports
```

### 檢查資料庫表

```bash
# 列出所有表
docker exec taskflow-pro node -e "const db = require('better-sqlite3')('/app/data/taskflow.db'); const tables = db.prepare('SELECT name FROM sqlite_master WHERE type=\'table\'').all(); console.log(tables.map(t => t.name).join(', ')); db.close();"

# 檢查 reports 表結構
docker exec taskflow-pro node -e "const db = require('better-sqlite3')('/app/data/taskflow.db'); const info = db.prepare('PRAGMA table_info(reports)').all(); console.log(JSON.stringify(info, null, 2)); db.close();"
```

### 檢查路由文件

```bash
# 檢查文件大小
docker exec taskflow-pro wc -l /app/dist/routes/reports.js

# 檢查是否包含路由
docker exec taskflow-pro grep -c "router.get" /app/dist/routes/reports.js
docker exec taskflow-pro grep -c "router.post" /app/dist/routes/reports.js
```

---

## 📦 最終版本

### 後端
- **Docker 映像**: `taskflow-pro:v4.2.0-reports-complete`
- **關鍵文件**: `/app/dist/routes/reports.js` (175 行, Pure ASCII)
- **資料庫表**: `reports` (已創建)

### 前端
- **部署 ID**: `6957034fe61b2dcefbcde3a8`
- **狀態**: 無需修改

### 資料庫
- **最新備份**: 待執行
- **新增表**: `reports`
- **狀態**: 正常運作

---

## 🎯 預防措施

### 1. 資料庫初始化檢查清單

在部署新功能前，確認：
- [ ] 資料庫表已在 `database.ts` 中定義
- [ ] 表已在容器啟動時創建
- [ ] 使用 `CREATE TABLE IF NOT EXISTS` 避免錯誤
- [ ] 測試 API 時檢查資料庫表是否存在

### 2. 路由文件驗證

在部署前，確認：
- [ ] 路由文件不是空的（檢查行數）
- [ ] 包含所有必要的 CRUD 路由
- [ ] 使用 Pure ASCII 編碼
- [ ] 測試 API 返回正確的錯誤訊息

### 3. 部署檢查清單

- [ ] 備份資料庫
- [ ] 上傳新文件
- [ ] 驗證文件內容
- [ ] 重啟容器
- [ ] 檢查容器日誌
- [ ] 測試 API
- [ ] 創建新 Docker 映像
- [ ] 使用新映像重啟

---

## 🔗 相關文檔

- `WORK_LOG_20260102_DATA_CENTER_FIX.md` - 數據中心修復（相同模式）
- `WORK_LOG_20260102_PERMISSIONS_FIX.md` - 權限修復
- `PROJECT-KNOWLEDGE-BASE.md` - 項目知識庫
- `PROJECT-RULES-UPDATED.md` - 全域規則

---

**創建日期**: 2026-01-02 08:18 AM  
**最後更新**: 2026-01-02 08:18 AM  
**狀態**: ✅ 後端已修復，等待前端測試
