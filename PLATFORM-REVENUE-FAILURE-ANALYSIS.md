# 平台營收 API 失敗原因分析

## 📋 失敗時間線

### 1. 初始部署（前端）
- ✅ 前端組件創建成功
- ✅ 前端編譯成功
- ✅ Netlify 部署成功
- ❌ API 調用返回 404

### 2. 後端診斷
- ✅ 路由文件存在：`/app/dist/routes/platform-revenue.js`
- ❌ 路由未在 `server.js` 中註冊

### 3. 第一次修復嘗試：註冊路由
- ✅ 在 `server.js` 中添加 require 語句
- ✅ 在 `server.js` 中添加 app.use 註冊
- ❌ 容器啟動失敗：`Cannot find module '../db-adapter'`

### 4. 第二次修復嘗試：修復 db-adapter 路徑
- ✅ 將 `../db-adapter` 改為 `./db-adapter`
- ❌ 容器啟動失敗：`Cannot find module './db-adapter'`

### 5. 診斷發現：db-adapter 不存在
- ❌ `/app/dist/db-adapter.js` 文件不存在
- ✅ 發現其他路由（如 kol.js）在文件內部定義 dbCall 函數

### 6. 第三次修復嘗試：添加 dbCall 函數定義
- ✅ 移除 db-adapter 導入
- ✅ 添加 dbCall 函數定義
- ❌ 發現所有 dbCall 使用了錯誤的語法模式

## 🎯 核心問題總結

### 問題 1：路由未註冊 ✅ 已修復
**原因**：創建了路由文件但忘記在 `server.js` 中註冊
**修復**：已添加註冊（但後續因其他問題被移除）

### 問題 2：錯誤的模塊導入 ✅ 已識別
**原因**：使用了不存在的 `db-adapter` 模塊
**正確方式**：在路由文件內部定義 dbCall 函數（參考 kol.js）

### 問題 3：錯誤的 dbCall 使用模式 ❌ 核心問題
**錯誤模式**（platform-revenue.js 中約 20+ 處）：
```javascript
await dbCall(db => {
  return db.prepare(query).get(...);
});
```

**正確模式**（參考 kol.js）：
```javascript
const db = req.db;
const result = dbCall(db, 'prepare', query).get(...);
```

### 問題 4：路由導出方式 ✅ 已修復
**錯誤**：導出為函數 `module.exports = (db) => {...}`
**正確**：直接導出 router `module.exports = router;`
**原因**：server.js 已通過全局中間件注入 req.db

## 🔬 技術細節分析

### dbCall 函數的正確定義（來自 kol.js）
```javascript
function dbCall(db, method, ...args) {
  if (typeof db[method] === 'function') {
    return db[method](...args);
  }
  if (db.db && typeof db.db[method] === 'function') {
    return db.db[method](...args);
  }
  throw new Error(`Method ${method} not found on database object`);
}
```

### 正確的使用方式
```javascript
router.get('/example', authenticateToken, async (req, res) => {
  try {
    const db = req.db;  // 從 req 獲取 db
    
    // 方式 1：簡單查詢
    const result = dbCall(db, 'prepare', 'SELECT * FROM table WHERE id = ?').get(id);
    
    // 方式 2：多行查詢
    const results = dbCall(db, 'prepare', 'SELECT * FROM table').all();
    
    // 方式 3：事務處理
    dbCall(db, 'prepare', 'BEGIN TRANSACTION').run();
    try {
      // ... 執行多個操作
      dbCall(db, 'prepare', 'COMMIT').run();
    } catch (err) {
      dbCall(db, 'prepare', 'ROLLBACK').run();
      throw err;
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## 📊 問題統計

### 需要修復的位置（platform-revenue.js）
1. ❌ 移除 db-adapter 導入（第 6 行）
2. ✅ 添加 dbCall 函數定義（已完成）
3. ❌ 修復 POST /parse 路由（約 5 處 dbCall）
4. ❌ 修復 POST /import 路由（約 3 處 dbCall）
5. ❌ 修復 GET / 路由（1 處 dbCall）
6. ❌ 修復 GET /platforms 路由（1 處 dbCall）
7. ❌ 修復 GET /stats 路由（1 處 dbCall）
8. ❌ 修復 GET /stats/by-date 路由（1 處 dbCall）
9. ❌ 修復 GET /history/:transactionId 路由（1 處 dbCall）
10. ❌ 修復 GET /history 路由（1 處 dbCall）
11. ❌ 修復 PUT /:id 路由（約 2 處 dbCall）
12. ❌ 修復 DELETE /:id 路由（約 2 處 dbCall）
13. ❌ 修復 POST /restore/:historyId 路由（約 2 處 dbCall）
14. ❌ 修復 GET /export 路由（1 處 dbCall）

**總計**：約 20-25 處需要修復

## 🎯 下一步行動

1. 查閱專案文檔確認正確的實施方式
2. 創建完全正確的 platform-revenue.js 文件
3. 使用 Pure ASCII 腳本部署
4. 測試驗證

## 📝 關鍵教訓

1. **必須參考現有路由**：應該先查看 kol.js、backup.js 等現有路由的實施方式
2. **不要假設模塊存在**：應該先檢查文件系統確認模塊是否存在
3. **遵循專案模式**：每個專案都有自己的模式，必須遵循
4. **容器內診斷**：使用容器內 Node.js 腳本進行精確診斷
