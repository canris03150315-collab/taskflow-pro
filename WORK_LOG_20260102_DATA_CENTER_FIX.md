# 工作日誌 - 2026-01-02 數據中心修復記錄

**日期**: 2026-01-02 07:42 AM - 08:04 AM  
**狀態**: ✅ 已完全修復  
**最終版本**: 
- 前端: Netlify Deploy ID `6957034fe61b2dcefbcde3a8`
- 後端: Docker Image `taskflow-pro:v3.9.0-attendance-v37-restored`
- 備份: 待執行

---

## 📋 問題描述

**症狀**: 
- 數據中心頁面顯示「無出勤資料」
- 前端調用 `GET /api/attendance` 返回「前端應用未找到」錯誤
- 無法查看任何出勤記錄

**影響範圍**:
- 部門數據中心功能完全無法使用
- 無法查看出勤歷史記錄
- 管理員無法進行數據分析

---

## 🔍 根本原因分析

### 問題：後端 attendance.js 缺少 GET / 路由

**位置**: `/app/dist/routes/attendance.js`

**錯誤狀況**:
- `attendance.js` 只有 `router.get('/status')` 路由
- **沒有** `router.get('/')` 路由來處理 `GET /api/attendance`
- 所有 `GET /api/attendance` 請求被 `server.js` 的萬用路由 `app.get('*')` 攔截
- 萬用路由返回「前端應用未找到」錯誤

**歷史記錄**:
根據 `PROJECT-KNOWLEDGE-BASE.md` 第 91-98 行，這個問題在 **V37.3** 已經解決過：
- 問題：「部門數據」頁面無法顯示出勤紀錄
- 解決：補回 `GET /api/attendance` 路由
- 但在某次修復後，正確的文件被損壞或替換

---

## 🔧 修復方案

### 嘗試的方法（失敗）

所有使用 PowerShell 創建腳本的方法都因為**引號嵌套問題**失敗：

1. ❌ **Here-String 方式** - PowerShell 解析多行命令導致語法錯誤
2. ❌ **echo 創建腳本** - bash 引號問題
3. ❌ **Python 腳本** - PowerShell 解析 Python 代碼導致錯誤
4. ❌ **docker exec python3 -c** - PowerShell 解析多行字符串失敗
5. ❌ **分步 echo** - bash 語法錯誤
6. ❌ **sed 命令** - PowerShell 引號嵌套問題

**根本原因**: PowerShell 會預先解析所有命令中的特殊字符，無論使用什麼方式都會導致引號或語法錯誤。

### 成功的方法

**使用本地源碼直接上傳**

根據全域規則和記憶倉庫：
1. 查閱 `PROJECT-KNOWLEDGE-BASE.md` 發現 V37.3 已經解決過此問題
2. 在本地找到 `attendance-v37-3.js`（Pure ASCII 版本）
3. 使用 `Get-Content | ssh` 管道方式上傳到伺服器
4. 使用 `docker cp` 複製到容器內

**關鍵命令**:
```powershell
# 上傳文件到伺服器
Get-Content "c:\Users\USER\Downloads\公司內部\attendance-v37-3.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/attendance-v37.js"

# 複製到容器並重啟
ssh root@165.227.147.40 "docker start taskflow-pro && sleep 3 && docker cp /tmp/attendance-v37.js taskflow-pro:/app/dist/routes/attendance.js && docker restart taskflow-pro"

# 創建新映像
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v3.9.0-attendance-v37-restored"
```

---

## 📝 V37.3 版本特點

**attendance-v37-3.js** 包含以下關鍵特性：

### 1. GET / 路由（缺失的路由）
```javascript
router.get('/', authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        
        // 返回最近 3 個月的記錄以避免過載
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
        const dateLimit = threeMonthsAgo.toISOString().split('T')[0];
        
        const records = await dbCall(db, 'all',
            'SELECT * FROM attendance_records WHERE date >= ? ORDER BY date DESC, clock_in DESC LIMIT 1000',
            [dateLimit]
        );
        
        res.json({ success: true, records: records || [] });
    } catch (error) {
        console.error('[Attendance V37.3] History error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});
```

### 2. Pure ASCII 編碼
- 所有中文訊息使用 Unicode Escape（例如：`\u6253\u5361`）
- 避免容器啟動時的 `SyntaxError: Invalid or unexpected token` 錯誤
- 符合 PROJECT-KNOWLEDGE-BASE.md 第 61 行的要求

### 3. dbCall 適配器
```javascript
const dbCall = async (db, method, sql, params = []) => {
    if (!db) throw new Error('Database connection missing in request object');
    const asyncMethod = method + 'Async';
    try {
        if (typeof db[asyncMethod] === 'function') return await db[asyncMethod](sql, params);
        if (typeof db[method] === 'function') {
            if (db.constructor.name === 'Database' && typeof db.prepare === 'function') {
                const stmt = db.prepare(sql);
                if (method === 'run') return stmt.run(...params);
                if (method === 'get') return stmt.get(...params);
                if (method === 'all') return stmt.all(...params);
            }
            return await db[method](sql, params);
        }
    } catch (err) {
        console.error(`[Attendance V37.3] DB Error (${method}):`, err.message);
        throw err;
    }
    throw new Error(`Database method ${method} or ${asyncMethod} not found`);
};
```

### 4. Taiwan Time (UTC+8) 邏輯
```javascript
const getTaiwanToday = () => {
    const now = new Date();
    const twTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return twTime.toISOString().split('T')[0];
};
```

---

## 🚨 關鍵教訓

### 1. 記憶倉庫是最重要的資源

**問題**: 花費大量時間嘗試用 PowerShell 創建腳本修復
**解決**: 查閱 `PROJECT-KNOWLEDGE-BASE.md` 立即找到 V37.3 已經解決過此問題

**教訓**: 
- ✅ **遇到問題先查閱記憶倉庫、工作日誌、全域規則**
- ✅ 本地源碼備份非常重要（`attendance-v37-*.js`）
- ✅ 不要重新發明輪子，使用已有的解決方案

### 2. PowerShell 引號嵌套是根本限制

**問題**: 所有嘗試在 PowerShell 中創建多行腳本的方法都失敗
**原因**: PowerShell 會預先解析所有特殊字符，無論使用什麼轉義方式

**解決方案**:
- ✅ 使用 `Get-Content | ssh` 管道方式上傳本地文件
- ✅ 避免在 PowerShell 中嵌套複雜的引號和多行字符串
- ✅ 使用 `docker cp` 而不是 `scp`（避免密碼提示）

### 3. ASCII Only 規則必須嚴格遵守

**問題**: 第一次上傳 `server/src/routes/attendance.js` 導致容器崩潰
**原因**: 文件包含中文字符，導致 `SyntaxError: Invalid or unexpected token`

**教訓**:
- ✅ 後端路由文件**必須使用 Pure ASCII**
- ✅ 中文訊息一律使用 Unicode Escape
- ✅ 這是 PROJECT-KNOWLEDGE-BASE.md 第 61 行的核心要求

### 4. Docker 映像管理

**問題**: 修復後沒有立即創建新映像，導致重啟後修改丟失
**解決**: 修復後立即 `docker commit` 創建新映像

**正確流程**:
```bash
# 1. 修復文件
docker cp /tmp/file.js taskflow-pro:/app/dist/routes/file.js

# 2. 重啟測試
docker restart taskflow-pro

# 3. 創建新映像（必須！）
docker commit taskflow-pro taskflow-pro:vX.X.X-description

# 4. 使用新映像重啟（可選，但推薦）
docker stop taskflow-pro && docker rm taskflow-pro
docker run -d --name taskflow-pro -p 3000:3000 -e PORT=3000 -v /app/data:/app/data taskflow-pro:vX.X.X-description
```

---

## 📊 修復統計

- **診斷時間**: 22 分鐘
- **修復時間**: 2 分鐘（找到正確方法後）
- **嘗試的方法**: 10+ 種（都失敗）
- **成功方法**: 使用本地源碼直接上傳
- **創建的 Docker 映像**: 15+ 個（調試過程）
- **最終穩定映像**: `taskflow-pro:v3.9.0-attendance-v37-restored`
- **前端部署**: 無需修改（Deploy ID `6957034fe61b2dcefbcde3a8`）

---

## 🔍 如何診斷類似問題

### 1. 檢查 API 返回錯誤

```bash
# 測試 API
curl http://localhost:3000/api/attendance

# 正常（需要認證）
{"error":"缺少認證 Token"}

# 異常（路由不存在）
{"error":"前端應用未找到"}
```

### 2. 檢查路由文件

```bash
# 查看路由定義
docker exec taskflow-pro grep -n "router.get" /app/dist/routes/attendance.js

# 應該包含 router.get('/')
```

### 3. 檢查容器日誌

```bash
# 查看啟動錯誤
docker logs taskflow-pro 2>&1 | tail -50

# 常見錯誤
SyntaxError: Invalid or unexpected token  # ← 包含中文字符
```

### 4. 查閱記憶倉庫

```bash
# 搜索相關問題
grep -r "attendance" PROJECT-KNOWLEDGE-BASE.md
grep -r "數據中心" *.md
```

---

## ✅ 驗證清單

- [x] 後端 GET /api/attendance 路由存在
- [x] 使用 Pure ASCII 編碼（無中文字符）
- [x] 包含 dbCall 適配器
- [x] 包含 Taiwan Time 邏輯
- [x] API 返回正確的認證錯誤（而非「前端應用未找到」）
- [x] 創建新 Docker 映像
- [x] 使用新映像重啟容器
- [x] 容器正常啟動無錯誤
- [x] 健康檢查通過
- [x] 數據中心頁面顯示出勤記錄

---

## 📦 最終版本

### 後端
- **Docker 映像**: `taskflow-pro:v3.9.0-attendance-v37-restored`
- **關鍵文件**: `/app/dist/routes/attendance.js` (V37.3)
- **特性**: Pure ASCII, GET / 路由, dbCall 適配器, UTC+8

### 前端
- **部署 ID**: `6957034fe61b2dcefbcde3a8`
- **狀態**: 無需修改

### 資料庫
- **備份**: 待執行
- **記錄數**: 82 條出勤記錄
- **狀態**: 正常運作

---

## 🎯 預防措施

### 1. 文件備份

- [ ] 定期備份關鍵路由文件（attendance.js, users.js, chat.js）
- [ ] 保留多個版本（v37-1, v37-2, v37-3）
- [ ] 記錄每個版本的特性和修復內容

### 2. 部署檢查清單

- [ ] 檢查文件是否為 Pure ASCII
- [ ] 驗證所有必要的路由都存在
- [ ] 測試 API 返回正確的錯誤訊息
- [ ] 檢查容器日誌無啟動錯誤
- [ ] 創建新 Docker 映像
- [ ] 備份資料庫

### 3. 文檔維護

- [ ] 更新 PROJECT-KNOWLEDGE-BASE.md
- [ ] 記錄新的修復方案
- [ ] 更新版本號和特性說明
- [ ] 記錄已知問題和解決方案

---

## 🔗 相關文檔

- `PROJECT-KNOWLEDGE-BASE.md` - 第 91-98 行（V37.3 記錄）
- `PROJECT-RULES-UPDATED.md` - PowerShell 引號規則
- `WORK_LOG_20260102_PERMISSIONS_FIX.md` - 權限修復記錄
- `AI-DEPLOYMENT-GUIDE.md` - 部署指南

---

**創建日期**: 2026-01-02 08:04 AM  
**最後更新**: 2026-01-02 08:04 AM  
**狀態**: ✅ 問題已完全解決
