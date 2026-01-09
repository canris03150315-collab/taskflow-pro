# 企業管理系統 - 全域規則 (Global Rules)

**🚨 任何 AI 在修改此項目前必須遵守這些規則！**

**最後更新**: 2026-01-06  
**版本**: v2.2

---

## 🔒 核心規則

### 1. 絕對禁止
- ❌ **不要編譯 TypeScript** - 此項目有編譯問題，必須直接寫 JavaScript
- ❌ **不要使用 scp 命令** - 會要求密碼，使用 SSH 工具替代
- ❌ **不要使用 PowerShell 的 `&&`** - 用分號 `;` 分隔命令
- ❌ **不要在雙引號內嵌套雙引號** - 使用 Here-String `@"..."@`
- ❌ **不要忘記認證中間件** - 所有 API 路由必須使用 `authenticateToken`

### 2. 必須遵守
- ✅ **必須先讀 PROJECT-KNOWLEDGE-BASE.md** - 了解項目特殊情況
- ✅ **必須使用 PowerShell 工具模組** - 避免語法問題
- ✅ **必須使用 JavaScript 不是 TypeScript** - 繞過編譯問題
- ✅ **必須包含錯誤處理** - 使用標準 try-catch 格式
- ✅ **必須創建完整快照後再修改** - 使用 `/root/create-snapshot.sh`（詳見 COMPLETE-BACKUP-STRATEGY.md）

---

## 🎯 項目特定規則

### 後端開發
```javascript
// ✅ 正確格式
const { authenticateToken } = require('../middleware/auth');

router.post('/endpoint', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    
    // 你的邏輯
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});
```

### 部署流程
```powershell
# ✅ 正確方式
Import-Module ".\PowerShell-Tools.psm1"
Send-FileToTaskFlow -FileName "your-file.js"
```

### PowerShell 語法
```powershell
# ✅ 正確寫法
$script = @"
多行
內容
"@
ssh taskflow $script

# ❌ 錯誤寫法
ssh taskflow "command1 && command2"  # 不要用 &&
```

---

## 📁 文件命名規則

### JavaScript 文件
- 使用 kebab-case: `user-management.js`
- 放在 `src/routes/` 目錄
- 部署到 `/app/dist/routes/`

### 文檔文件
- 使用 UPPER-KEBAB-CASE: `DEPLOYMENT-GUIDE.md`
- 重要文檔必須更新最後修改日期
- 包含版本號

---

## 🔧 工具使用規則

### 必須使用的工具
1. **PowerShell-Tools.psm1** - 所有部署和操作
2. **simple-deploy.ps1** - 快速部署
3. **quick-clear.ps1** - 清理數據

### 工具函數
```powershell
# ✅ 推薦
Send-FileToTaskFlow -FileName "file.js"
Get-TaskFlowStatus
Clear-AttendanceRecords
Backup-TaskFlowDB

# ❌ 避免
scp file.js root@host:/path/  # 會要求密碼
```

---

## 📝 代碼規範

### JavaScript
- 使用 async/await
- 錯誤處理必須包含日誌
- 返回統一格式: `{ success: boolean, data?: any, error?: string }`

### PowerShell
- 使用批准的動詞 (Get, Set, Send, Invoke 等)
- 避免複雜的引號嵌套
- 使用 Here-String 處理多行

---

## 🚀 部署規則

### 部署前檢查清單
- [ ] **創建完整系統快照**: `ssh root@165.227.147.40 "/root/create-snapshot.sh v版本號"`
- [ ] 驗證快照文件完整性
- [ ] 代碼已備份
- [ ] 使用 JavaScript 格式
- [ ] 包含認證中間件
- [ ] 錯誤處理完整
- [ ] 測試過基本功能

### 部署步驟
1. **創建快照**: `/root/create-snapshot.sh v當前版本`
2. 部署: `Send-FileToTaskFlow`
3. 重啟: 自動或手動
4. 測試: 檢查 API 響應
5. **創建新快照**: `/root/create-snapshot.sh v新版本`
6. **Commit 新映像**: `docker commit taskflow-pro taskflow-pro:v新版本`

---

## 🐛 調試規則

### 查看問題
1. 查看日誌: `ssh taskflow "docker logs taskflow-pro --tail 20"`
2. 檢查狀態: `Get-TaskFlowStatus`
3. 測試 API: `curl http://165.227.147.40/api/health`

### 常見解決方案
- 500 錯誤 → 檢查 JavaScript 語法
- 認證失敗 → 檢查中間件
- 容器問題 → 重啟容器

---

## 📚 文檔規則

### 必須維護的文檔
1. **PROJECT-KNOWLEDGE-BASE.md** - 每次重大修改後更新
2. **POWERSHELL-SYNTAX-GUIDE.md** - 發現新問題時添加
3. **DEPLOYMENT-GUIDE.md** - 部署流程變更時更新

### 文檔格式
- 使用 Markdown
- 包含創建和修改日期
- 代碼塊指定語言
- 重要信息使用符號標註

---

## 🔐 安全規則

### 密碼和密鑰
- SSH 密碼: j7WW03n4emoh（測試完成後必須修改）
- 不要在代碼中硬編碼密碼
- 使用環境變數或配置文件

### 資料庫
- 操作前備份
- 敏感數據加密
- 定期清理測試數據

---

## ⚡ 效率規則

### 避免重複工作
- 使用現有工具函數
- 查考已有解決方案
- 記錄新問題和解決方案

### 快速操作
- 使用 PowerShell 工具模組
- 批量操作用腳本
- 自動化重複任務

---

## 🎨 部門 ID 標準化規則

### 當前資料庫中的部門 ID（標準）
- ✅ `UNASSIGNED` - 待分配 / 新人（**必須使用此 ID**）
- ✅ `Management` - 營運管理部
- ✅ `Engineering` - 技術工程部
- ✅ `Marketing` - 市場行銷部
- ✅ `HR` - 人力資源部

### 代碼中必須使用的 ID
- ✅ **待分配部門**: 使用 `'UNASSIGNED'`（全大寫）
- ❌ **不要使用**: `'dept-unassigned'`（kebab-case）
- ❌ **不要使用**: `'unassigned'`（小寫）

### 檢查清單
在編寫涉及部門的代碼時：
- [ ] 檢查資料庫中的實際部門 ID
- [ ] 使用正確的大小寫格式
- [ ] 前後端使用相同的部門 ID
- [ ] 測試時驗證部門 ID 是否存在

### 診斷方法
```javascript
// 使用此腳本檢查部門 ID
const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');
const allDepts = db.prepare('SELECT id, name FROM departments').all();
console.log('All departments:');
allDepts.forEach(d => console.log('  -', d.id, ':', d.name));
db.close();
```

---

## 🚨 違規處理

如果 AI 違反這些規則：
1. 第一次：提醒並糾正
2. 第二次：停止操作並要求重讀規則
3. 第三次：更換 AI 或尋求人工干預

---

## 📞 緊急命令

### 創建完整快照（推薦）
```bash
ssh root@165.227.147.40 "/root/create-snapshot.sh v版本號"
```

### 快速資料庫備份
```bash
ssh taskflow "docker exec taskflow-pro node dist/index.js backup"
```

### 使用系統內建備份功能（推薦）
```bash
# 下載備份：使用 BOSS 帳號登入系統設定頁面，點擊「下載備份」
# 上傳備份：使用 BOSS 帳號登入系統設定頁面，點擊「選擇檔案」上傳 .db 檔案
# 注意：上傳備份會自動備份現有資料庫到 taskflow.db.backup-{timestamp}
```

### 重啟
```bash
ssh taskflow "docker restart taskflow-pro"
```

### 查看日誌
```bash
ssh taskflow "docker logs taskflow-pro --tail 50"
```

### 恢復快照
```bash
ssh root@165.227.147.40 "cd /root/taskflow-snapshots && tar -xzf 快照文件.tar.gz"
# 然後按照快照中的 RESTORE.md 執行
```

---

## 🔄 版本歷史

### v2.2 (2026-01-06)
- ✅ 新增系統內建備份功能說明
- ✅ 添加備份下載和上傳使用指南
- ✅ 更新緊急命令區域

### v2.1 (2026-01-06)
- ✅ 新增部門 ID 標準化規則
- ✅ 明確待分配部門必須使用 `UNASSIGNED`
- ✅ 新增診斷方法和檢查清單

### v2.0 (2026-01-03)
- ✅ 新增前後端通訊架構
- ✅ 更新備份策略（完整快照）

### v1.0 (2025-12-29)
- ✅ 初始版本
- ✅ 基本規則和工具使用指南

---

## 📋 重要提醒

1. **測試完成後修改 SSH 密碼！**
2. **每次修改前創建完整快照！**（不只是資料庫備份）
3. **遵循已有規範，不要重新發明輪子！**
4. **快照包含 Docker 映像 + 資料庫 + 配置文件**
5. **詳細備份策略見 COMPLETE-BACKUP-STRATEGY.md**
6. **部門 ID 必須與資料庫一致！**

---

**生效日期**: 2025-12-29  
**最後更新**: 2026-01-06  
**維護者**: Cascade AI
