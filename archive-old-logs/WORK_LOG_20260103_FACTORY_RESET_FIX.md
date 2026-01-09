# 恢復原廠設定 500 錯誤修復

**日期**：2026-01-03  
**版本**：v8.9.8-factory-reset-fixed  
**狀態**：✅ 已修復

---

## 📋 問題描述

執行恢復原廠設定時返回 500 Internal Server Error：

```
POST https://transcendent-basbousa-6df2d2.netlify.app/api/system/reset-factory 500 (Internal Server Error)
Request failed: POST /system/reset-factory Error: 伺服器內部錯誤
```

---

## 🔍 錯誤診斷

### 後端日誌
```
開始恢復原廠設定...
恢復原廠設定錯誤: TypeError: tables is not iterable
    at /app/dist/routes/system.js:23:29
```

### 根本原因
**資料庫 API 使用錯誤**：

**錯誤代碼**：
```javascript
const tables = db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
```

**問題**：
- `req.db` 是 better-sqlite3 的同步 API
- 應該使用 `db.prepare().all()` 而不是 `db.all()`
- `db.all()` 方法不存在，導致返回 undefined
- 嘗試迭代 undefined 導致 `TypeError: tables is not iterable`

---

## ✅ 修復方案

### 正確的資料庫查詢方式

```javascript
// ❌ 錯誤寫法
const tables = db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");

// ✅ 正確寫法
const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
const tables = stmt.all();
```

### 修復後的完整代碼

```javascript
router.post('/reset-factory', auth_1.authenticateToken, async (req, res) => {
    try {
        const currentUser = req.user;
        
        if (currentUser.role !== 'BOSS') {
            return res.status(403).json({ error: '只有管理員可以恢復原廠設定' });
        }
        
        const db = req.db;
        
        console.log('開始恢復原廠設定...');
        
        // 使用 prepare().all() 而不是 db.all()
        const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
        const tables = stmt.all();
        
        console.log('找到', tables.length, '個表');
        
        // 刪除所有表的數據
        for (const table of tables) {
            const tableName = table.name;
            console.log('清空表:', tableName);
            const deleteStmt = db.prepare(`DELETE FROM ${tableName}`);
            deleteStmt.run();
        }
        
        // 記錄日誌
        try {
            db.logAction(currentUser.id, currentUser.name, 'FACTORY_RESET', '系統恢復原廠設定', 'WARNING');
        } catch (error) {
            console.error('記錄日誌失敗:', error);
        }
        
        console.log('恢復原廠設定完成');
        
        res.json({ 
            success: true, 
            message: '系統已恢復原廠設定，請重新設定管理員帳號' 
        });
    } catch (error) {
        console.error('恢復原廠設定錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
```

---

## 🚀 部署步驟

### 1. 創建修復腳本
```powershell
Get-Content "fix-system-routes.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/fix-system-routes.js"
```

### 2. 執行修復
```bash
ssh root@165.227.147.40 "docker cp /tmp/fix-system-routes.js taskflow-pro:/app/fix-system-routes.js && docker exec -w /app taskflow-pro node fix-system-routes.js"
```

### 3. 重啟容器
```bash
ssh root@165.227.147.40 "docker restart taskflow-pro"
```

### 4. 創建新映像和快照
```bash
docker commit taskflow-pro taskflow-pro:v8.9.8-factory-reset-fixed
/root/create-snapshot.sh v8.9.8-factory-reset-fixed
```

---

## 📦 最終版本

- **後端映像**：`taskflow-pro:v8.9.8-factory-reset-fixed`
- **快照**：`taskflow-snapshot-v8.9.8-factory-reset-fixed-20260103_140113.tar.gz` (214MB)
- **狀態**：✅ 已修復

---

## 🎓 關鍵教訓

### 1. better-sqlite3 API 使用
- ✅ 正確：`db.prepare(sql).all()`
- ❌ 錯誤：`db.all(sql)`（此方法不存在）

### 2. 同步 vs 異步
- better-sqlite3 是同步 API
- 不需要 await
- 使用 prepare() 創建 statement，然後調用 .all()、.get()、.run()

### 3. 錯誤處理
- 添加詳細的日誌輸出
- 使用 try-catch 捕獲錯誤
- 返回有意義的錯誤訊息

### 4. 測試重要性
- 實現新功能後必須測試
- 檢查後端日誌確認錯誤
- 使用容器內腳本測試 API

---

## 🧪 測試確認

現在可以正常執行恢復原廠設定：

1. 登入 BOSS 帳號
2. 進入系統設定
3. 點擊「恢復原廠設定」
4. 確認兩次
5. 系統應成功重置並重新載入

---

**創建日期**：2026-01-03  
**最後更新**：2026-01-03  
**作者**：AI Assistant
