# TaskFlow Pro - AI 移交指南 (2026-01-01 V3)

## 🚨 核心溝通規範 (Critical Communication Rule)
**此專案的所有回覆、註解、文檔必須使用繁體中文 (Traditional Chinese)。**
這是一條全域規則，請務必遵守。

---

## 📌 當前系統狀態 (Version 2.2.5)
- **核心狀態**: 系統已穩定，核心 API（使用者、打卡、通訊）運作正常。
- **打卡系統**: 升級至 **V37.2**，採用全 ASCII 編碼與 UTC+8 時區邏輯，解決了編碼崩潰與跨日時區問題。
- **通訊系統**: 升級至 **V36**，支援 WebSocket 與 REST 雙模式，具備 `dbCall` 適配器。

## 🛠️ 標準化診斷與修復流程 (SOP)

### 1. 診斷 (Diagnosis)
遇到問題時，**絕對不要** 依賴 PowerShell 外部猜測。請直接進入容器內部診斷。

**標準診斷腳本模板**:
```javascript
// /tmp/diag.js
const DatabaseV2 = require('./dist/database-v2');
const db = new DatabaseV2.SecureDatabase();
async function run() {
    try {
        await db.initialize();
        // 1. 查詢資料庫
        const records = await db.allAsync("SELECT * FROM attendance_records ORDER BY clock_in DESC LIMIT 5");
        console.log('DB_DATA: ' + JSON.stringify(records));
        
        // 2. (選用) 模擬 API 呼叫
        // const attendance = require('./dist/routes/attendance');
        // ... invoke handler manually ...
    } catch (e) {
        console.log('ERROR: ' + e.message);
    } finally {
        await db.close();
    }
}
run();
```
**執行指令**:
```powershell
# 1. 本地寫入檔案
$code | Out-File -Encoding utf8 diag.js
# 2. 轉 Base64 傳輸 (防止編碼損壞)
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((Get-Content diag.js -Raw)))
$cmd = "echo '$b64' | base64 -d > /app/diag.js && node /app/diag.js"
ssh root@host "docker exec taskflow-pro sh -c ""$cmd"""
```

### 2. 開發規範 (Coding Standards)
為了避免環境差異導致的崩潰，所有新代碼必須遵守：

1.  **dbCall 適配器**: 必須使用 `dbCall` 函數來呼叫資料庫，以相容 `SecureDatabase` (Async) 與 `better-sqlite3` (Sync)。
    ```javascript
    const dbCall = async (db, method, sql, params) => { ... } // 參考 attendance-v37.2.js
    ```
2.  **ASCII Only**: 後端路由文件 **禁止包含中文字符**。請使用 Unicode Escape (例如 `\u6253\u5361`)。
3.  **時區明確**: 不要使用 `new Date().toISOString().split('T')[0]` 來判斷「今天」，這會導致 UTC 0點問題。請使用：
    ```javascript
    const getTaiwanToday = () => {
        const now = new Date();
        const twTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
        return twTime.toISOString().split('T')[0];
    };
    ```

### 3. 部署流程 (Deployment)
1.  **備份**: `Backup-TaskFlowDB` (如有)。
2.  **寫入**: 使用 Base64 傳輸將 `.js` 檔案寫入 `/app/dist/routes/`。
3.  **重啟**: `docker restart taskflow-pro`。
4.  **驗證**: 立即執行診斷腳本確認 API 回傳 200。

## 🔍 已知遺留問題與待辦
- [ ] **其他模組適配**: 論壇 (`forum.js`) 與 財務 (`finance.js`) 尚未升級至 `dbCall` 模式，未來修改時應優先升級。
- [ ] **日誌監控**: 建議建立自動化腳本定期檢查 `/app/pm2` 或 Docker 日誌中的 500 錯誤。

---
**移交人**: Cascade (V37.2 Fixer)
**日期**: 2026-01-01
