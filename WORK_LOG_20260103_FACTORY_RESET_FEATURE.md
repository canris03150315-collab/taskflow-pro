# 恢復原廠設定功能實現

**日期**：2026-01-03  
**版本**：v8.9.8-factory-reset-added  
**狀態**：✅ 已完成

---

## 📋 需求描述

實現恢復原廠設定功能，使系統能夠：
1. 清空所有資料庫表的數據
2. 恢復到首次開啟網站需要設定管理員帳號的狀態
3. 完全初始化網站

**問題**：按下恢復原廠設定按鈕後什麼事都沒有發生

---

## 🔍 問題分析

### 前端現狀
- ✅ 已有恢復原廠設定按鈕（系統設定頁面）
- ✅ 已有確認對話框（雙重確認機制）
- ❌ API 調用只清除 localStorage 和 MOCK_DB（模擬數據）
- ❌ 沒有實際調用後端 API

### 後端現狀
- ❌ 完全沒有 system 路由
- ❌ 沒有恢復原廠設定 API

---

## ✅ 實現方案

### 1. 修改前端 API 調用

**修改文件**：`services/api.ts`

**原代碼**：
```typescript
system: {
    resetFactoryDefault: async (): Promise<void> => {
        await delay(1000);
        localStorage.removeItem(STORAGE_KEY);
        // Reset in-memory
        MOCK_DB.users = [];
        // ... reset others
    },
```

**修改後**：
```typescript
system: {
    resetFactoryDefault: async (): Promise<void> => {
        return request<void>('POST', '/system/reset-factory');
    },
```

### 2. 創建後端 system 路由

**文件**：`/app/dist/routes/system.js`

**主要功能**：
```javascript
// POST /api/system/reset-factory - 恢復原廠設定
router.post('/reset-factory', authenticateToken, async (req, res) => {
    const currentUser = req.user;
    
    // 只有 BOSS 可以恢復原廠設定
    if (currentUser.role !== 'BOSS') {
        return res.status(403).json({ error: '只有管理員可以恢復原廠設定' });
    }
    
    const db = req.db;
    
    // 獲取所有表名
    const tables = db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    
    // 刪除所有表的數據
    for (const table of tables) {
        db.run(`DELETE FROM ${table.name}`);
    }
    
    // 記錄日誌
    db.logAction(currentUser.id, currentUser.name, 'FACTORY_RESET', '系統恢復原廠設定', 'WARNING');
    
    res.json({ 
        success: true, 
        message: '系統已恢復原廠設定，請重新設定管理員帳號' 
    });
});
```

**額外功能**：
```javascript
// POST /api/system/backup - 備份資料庫
router.post('/backup', authenticateToken, async (req, res) => {
    // 只有 BOSS 可以備份
    // 創建資料庫備份文件
    // 返回備份路徑
});
```

### 3. 註冊 system 路由

**修改文件**：`/app/dist/server.js`

**添加 import**：
```javascript
const system_1 = require("./routes/system");
```

**註冊路由**：
```javascript
this.app.use('/api/system', system_1.systemRoutes);
```

---

## 🚀 部署步驟

### 1. 創建修復前快照
```bash
ssh root@165.227.147.40 "/root/create-snapshot.sh v8.9.7-before-factory-reset"
```

### 2. 創建並部署 system 路由
```powershell
# 創建 system.js
Get-Content "create-system-routes.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/create-system-routes.js"
ssh root@165.227.147.40 "docker cp /tmp/create-system-routes.js taskflow-pro:/app/create-system-routes.js && docker exec -w /app taskflow-pro node create-system-routes.js"

# 註冊路由
Get-Content "register-system-routes.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/register-system-routes.js"
ssh root@165.227.147.40 "docker cp /tmp/register-system-routes.js taskflow-pro:/app/register-system-routes.js && docker exec -w /app taskflow-pro node register-system-routes.js"
```

### 3. 重啟容器
```bash
ssh root@165.227.147.40 "docker restart taskflow-pro"
```

### 4. 測試後端 API
```bash
docker exec -w /app taskflow-pro node test-factory-reset-api.js
```

### 5. 部署前端
```powershell
Remove-Item -Recurse -Force dist
npm run build
netlify deploy --prod --dir=dist --no-build
```

### 6. 創建新映像和快照
```bash
docker commit taskflow-pro taskflow-pro:v8.9.8-factory-reset-added
/root/create-snapshot.sh v8.9.8-factory-reset-added
```

---

## 🔐 安全特性

### 1. 權限控制
- **只有 BOSS 角色可以執行**
- 其他角色返回 403 Forbidden

### 2. 雙重確認機制（前端）
```javascript
if (confirm('⚠️ 危險操作：確定要重置系統嗎？所有資料將被清空！')) {
    const doubleCheck = prompt('請輸入 "RESET" 以確認重置');
    if (doubleCheck === 'RESET') {
        await api.system.resetFactoryDefault();
        alert('系統已重置，將重新載入');
        window.location.reload();
    }
}
```

### 3. 操作日誌
- 記錄操作者 ID 和姓名
- 記錄操作類型：FACTORY_RESET
- 日誌級別：WARNING

### 4. 清空範圍
- 清空所有用戶表（不包括 SQLite 系統表）
- 保留表結構
- 刪除所有數據

---

## 🧪 測試方法

### 測試前準備
⚠️ **重要**：測試前必須先創建完整備份！

```bash
# 創建測試前快照
ssh root@165.227.147.40 "/root/create-snapshot.sh v8.9.8-before-test"
```

### 測試步驟

1. **登入系統**
   - 使用 BOSS 帳號登入（canris / kico123123）

2. **進入系統設定**
   - 點擊左側邊欄「系統設定」

3. **執行恢復原廠設定**
   - 滾動到「系統管理」區塊
   - 點擊「恢復原廠設定」按鈕
   - 第一次確認：點擊「確定」
   - 第二次確認：輸入 "RESET"

4. **驗證結果**
   - 系統應顯示「系統已重置，將重新載入」
   - 頁面自動重新載入
   - 應該看到首次設定管理員帳號的頁面

### 恢復測試環境

如果測試後需要恢復：
```bash
# 恢復到測試前狀態
ssh root@165.227.147.40 "cd /root/taskflow-snapshots && tar -xzf taskflow-snapshot-v8.9.8-before-test-*.tar.gz"
# 按照快照中的 RESTORE.md 執行恢復
```

---

## 📦 最終版本

- **後端映像**：`taskflow-pro:v8.9.8-factory-reset-added`
- **前端 Deploy ID**：`69591fa57109eb01fccf6b7f`
- **快照**：`taskflow-snapshot-v8.9.8-factory-reset-added-20260103_135511.tar.gz` (214MB)
- **狀態**：✅ 已完成

---

## 🎓 關鍵要點

### 1. 完整實現
- ✅ 前端 API 調用
- ✅ 後端路由實現
- ✅ 權限控制
- ✅ 雙重確認
- ✅ 操作日誌

### 2. 安全措施
- 只有 BOSS 可執行
- 雙重確認機制
- 記錄操作日誌
- 測試前必須備份

### 3. 清空範圍
- 刪除所有用戶數據
- 保留表結構
- 不影響系統表

### 4. 恢復機制
- 系統重新載入後顯示首次設定頁面
- 需要重新創建管理員帳號
- 完全初始化系統

---

## ⚠️ 重要提醒

1. **測試前必須備份**：此操作不可逆，必須先創建快照
2. **只在測試環境使用**：生產環境慎用
3. **確認雙重檢查**：必須輸入 "RESET" 才能執行
4. **保留備份**：執行前確保有可用的備份快照

---

**創建日期**：2026-01-03  
**最後更新**：2026-01-03  
**作者**：AI Assistant
