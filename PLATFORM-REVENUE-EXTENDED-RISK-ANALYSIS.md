# 平台營收擴充功能 - 風險分析與預防措施

## 📋 已修正的問題

### ✅ 1. dbCall 使用模式錯誤
**問題**：原始 `platform-revenue-extended.js` 使用了錯誤的 dbCall 模式（11 處）
```javascript
// ❌ 錯誤
await dbCall(db => {
  return db.prepare(query).get(...);
});

// ✅ 正確
const db = req.db;
const result = dbCall(db, 'prepare', query).get(...);
```
**修正**：已在 `platform-revenue-extended-fixed.js` 中全部修正

### ✅ 2. Pure ASCII 規範
**問題**：後端路由必須使用 Pure ASCII，中文需要 Unicode Escape
**修正**：已確認所有中文都使用 Unicode Escape（如 `\u8acb\u4e0a\u50b3\u6a94\u6848`）

### ✅ 3. 欄位檢查機制
**問題**：直接執行 ALTER TABLE 可能導致 "duplicate column name" 錯誤
**修正**：使用 `PRAGMA table_info` 先檢查欄位是否存在

### ✅ 4. Excel 解析欄位數量
**問題**：原系統每平台 11 欄，實際 Excel 有 16 欄
**修正**：已改為 `col += 16`

---

## ⚠️ 可能發生的錯誤（按優先級排序）

### 🔴 高風險錯誤

#### 錯誤 1：Excel 欄位順序不匹配
**問題描述**：
- 您的 Excel 檔案欄位順序可能與我們假設的不同
- 導致數據錯位（例如：反水的值被存到真人數）

**症狀**：
- 上傳成功但數據不正確
- 數值出現在錯誤的欄位
- 統計數據異常

**診斷方法**：
```javascript
// 創建 diagnose-excel-structure.js
const xlsx = require('xlsx');
const fs = require('fs');

const buffer = fs.readFileSync('/app/data/uploads/最新檔案.xlsx');
const workbook = xlsx.read(buffer);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];

// 檢查第一行標題
for (let col = 0; col < 20; col++) {
  const cell = worksheet[xlsx.utils.encode_cell({ r: 0, c: col })];
  if (cell) console.log(`Column ${col}: ${cell.v}`);
}
```

**預防措施**：
1. 部署後先用您的實際 Excel 檔案測試
2. 檢查上傳後的數據是否正確
3. 如果錯位，調整 `parseExcelFile` 函數中的 `getCell(offset)` 順序

**修復方案**：
- 創建 `fix-excel-column-mapping.js` 調整欄位映射
- 重新上傳數據

---

#### 錯誤 2：資料庫欄位類型不匹配
**問題描述**：
- `real_person_count` 定義為 INTEGER，但可能收到小數
- 導致數據截斷或錯誤

**症狀**：
- 插入數據時出現 500 錯誤
- 數據精度丟失

**診斷方法**：
```javascript
// 檢查實際數據類型
const records = parseExcelFile(buffer);
records.forEach(r => {
  console.log('real_person_count:', r.real_person_count, typeof r.real_person_count);
});
```

**預防措施**：
- 如果 `real_person_count` 可能有小數，改為 REAL 類型
- 在 `parseExcelFile` 中強制轉換：`Math.floor(getCell(1))`

**修復方案**：
```javascript
// fix-real-person-count-type.js
db.exec('ALTER TABLE platform_transactions RENAME COLUMN real_person_count TO real_person_count_old');
db.exec('ALTER TABLE platform_transactions ADD COLUMN real_person_count REAL DEFAULT 0');
db.exec('UPDATE platform_transactions SET real_person_count = real_person_count_old');
db.exec('ALTER TABLE platform_transactions DROP COLUMN real_person_count_old');
```

---

#### 錯誤 3：容器重啟後路由未註冊
**問題描述**：
- 路由檔案已更新，但 `server.js` 中未註冊
- 容器重啟後 API 返回 404

**症狀**：
- `GET /api/platform-revenue` 返回 404
- 前端無法調用 API

**診斷方法**：
```bash
# 檢查路由是否註冊
ssh root@165.227.147.40 "docker exec taskflow-pro grep -n 'platform-revenue' /app/dist/server.js"
```

**預防措施**：
- 平台營收路由應該已經在 v8.9.193 註冊
- 部署後檢查 API 是否可訪問

**修復方案**：
```javascript
// register-platform-revenue-route.js
const fs = require('fs');
const serverPath = '/app/dist/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

if (!content.includes("app.use('/api/platform-revenue'")) {
  const insertPoint = content.indexOf("app.use('/api/reports'");
  const routeCode = "\napp.use('/api/platform-revenue', require('./routes/platform-revenue'));\n";
  content = content.slice(0, insertPoint) + routeCode + content.slice(insertPoint);
  fs.writeFileSync(serverPath, content);
  console.log('SUCCESS: Route registered');
}
```

---

### 🟡 中風險錯誤

#### 錯誤 4：舊數據沒有新欄位值
**問題描述**：
- 資料庫中已有的舊記錄，新欄位都是 0
- 統計數據不完整

**症狀**：
- 新上傳的數據有值，舊數據全是 0
- 統計結果偏低

**預防措施**：
- 這是預期行為，舊數據確實沒有新欄位
- 需要重新上傳完整的 Excel 檔案覆蓋舊數據

**解決方案**：
1. 使用「覆蓋舊數據」選項重新上傳
2. 或者保留舊數據，只統計有新欄位的記錄

---

#### 錯誤 5：JSON 解析錯誤（歷史記錄）
**問題描述**：
- `old_data` 或 `new_data` 包含新欄位
- 舊版本的還原功能可能無法處理

**症狀**：
- 還原歷史記錄時出現 500 錯誤
- JSON.parse 失敗

**預防措施**：
- 已在 `platform-revenue-extended-fixed.js` 中正確處理
- 使用 `JSON.parse(historyRecord.old_data || '{}')`

---

#### 錯誤 6：前端顯示欄位不足
**問題描述**：
- 後端已支援新欄位，但前端組件未更新
- 用戶看不到新數據

**症狀**：
- 統計表格只顯示舊欄位
- 詳細資料缺少新欄位

**修復方案**：
需要更新以下前端組件：
1. `RevenueStatsTab.tsx` - 統計表格
2. `RevenueDateStatsTab.tsx` - 日期統計
3. `RevenueHistoryTab.tsx` - 歷史記錄顯示

---

### 🟢 低風險錯誤

#### 錯誤 7：Excel 檔案格式問題
**問題描述**：
- Excel 檔案損壞或格式不正確
- 無法解析

**症狀**：
- 上傳時出現「解析檔案失敗」錯誤

**預防措施**：
- 前端已限制檔案大小（10MB）
- 已限制檔案類型（.xlsx, .xls）

**修復方案**：
- 請用戶重新保存 Excel 檔案
- 確認檔案未損壞

---

#### 錯誤 8：權限問題
**問題描述**：
- 非 SUPERVISOR/MANAGER/BOSS 無法訪問
- Token 過期

**症狀**：
- API 返回 401 或 403

**預防措施**：
- 前端已實施權限檢查
- 後端已實施 `authenticateToken` 中間件

---

#### 錯誤 9：統計查詢效能問題
**問題描述**：
- 新增 7 個欄位的 SUM 計算
- 大量數據時查詢變慢

**症狀**：
- 統計頁面載入緩慢
- 超時錯誤

**預防措施**：
- 已有索引：`idx_platform_transactions_date`
- 已有索引：`idx_platform_transactions_platform`

**優化方案**：
```sql
-- 如果需要，可以添加複合索引
CREATE INDEX idx_platform_date_platform 
ON platform_transactions(date, platform_name);
```

---

## 🔧 部署後檢查清單

### 立即檢查（部署完成後 5 分鐘內）

- [ ] **容器狀態**
  ```bash
  ssh root@165.227.147.40 "docker ps | grep taskflow-pro"
  ```
  預期：顯示 "Up X minutes"

- [ ] **資料庫欄位**
  ```bash
  ssh root@165.227.147.40 "docker exec -w /app taskflow-pro node test-extended-platform-revenue.js"
  ```
  預期：顯示 "All Tests Passed"

- [ ] **API 可訪問性**
  ```bash
  curl -H "Authorization: Bearer YOUR_TOKEN" http://165.227.147.40:3000/api/platform-revenue/platforms
  ```
  預期：返回平台列表（200 或 401）

### 功能測試（部署後 30 分鐘內）

- [ ] **上傳測試**
  1. 登入系統
  2. 進入「工作報表」→「平台營收」→「上傳報表」
  3. 上傳您的 Excel 檔案
  4. 檢查解析結果是否正確

- [ ] **數據驗證**
  1. 查看「平台統計」
  2. 確認新欄位有數據（反水、真人數、棋牌等）
  3. 檢查數值是否合理

- [ ] **統計功能**
  1. 測試日期範圍篩選
  2. 測試平台篩選
  3. 測試匯出 Excel

- [ ] **歷史記錄**
  1. 查看修改記錄
  2. 測試還原功能（如果有權限）

---

## 🚨 緊急回滾方案

如果部署後出現嚴重問題，按以下步驟回滾：

### 方案 A：回滾到部署前快照（推薦）
```bash
# 1. 停止容器
ssh root@165.227.147.40 "docker stop taskflow-pro"

# 2. 恢復快照
ssh root@165.227.147.40 "cd /root && tar -xzf taskflow-snapshot-v8.9.140-before-platform-revenue-extended-*.tar.gz"

# 3. 啟動容器
ssh root@165.227.147.40 "docker start taskflow-pro"
```

### 方案 B：只回滾後端路由
```bash
# 1. 恢復舊的路由檔案
ssh root@165.227.147.40 "docker cp taskflow-pro:/app/dist/routes/platform-revenue.js /tmp/platform-revenue-backup.js"

# 2. 上傳舊版本
Get-Content "platform-revenue-fixed.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/platform-revenue-old.js"
ssh root@165.227.147.40 "docker cp /tmp/platform-revenue-old.js taskflow-pro:/app/dist/routes/platform-revenue.js"

# 3. 重啟容器
ssh root@165.227.147.40 "docker restart taskflow-pro"
```

### 方案 C：只移除新欄位（不推薦）
```javascript
// remove-new-columns.js
const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

// SQLite 不支援 DROP COLUMN，需要重建表
// 這個方案比較複雜，建議使用方案 A 或 B
```

---

## 📊 監控指標

部署後持續監控以下指標：

1. **容器健康狀態**
   - 每小時檢查一次
   - 確保容器持續運行

2. **API 響應時間**
   - 平台列表 API：< 100ms
   - 統計 API：< 500ms
   - 上傳解析：< 3s

3. **錯誤日誌**
   ```bash
   ssh root@165.227.147.40 "docker logs taskflow-pro --tail 50"
   ```

4. **資料庫大小**
   ```bash
   ssh root@165.227.147.40 "docker exec taskflow-pro ls -lh /app/data/taskflow.db"
   ```

---

## 📝 已知限制

1. **Excel 檔案大小**：最大 10MB
2. **歷史記錄**：最多顯示 1000 筆
3. **欄位數量**：每平台固定 16 欄（如果 Excel 結構改變需要修改代碼）
4. **SQLite 限制**：不支援 DROP COLUMN（如果需要移除欄位，需要重建表）

---

## 🎓 關鍵教訓總結

1. **必須先檢查欄位是否存在**（使用 PRAGMA table_info）
2. **必須使用正確的 dbCall 模式**（`const db = req.db; dbCall(db, 'prepare', ...)`）
3. **必須使用 Pure ASCII**（中文用 Unicode Escape）
4. **必須在容器內診斷**（不要在外部猜測）
5. **必須創建快照**（部署前後都要）
6. **必須測試驗證**（不要假設成功）
7. **必須有回滾方案**（隨時準備回滾）

---

## ✅ 準備就緒檢查

部署前確認：
- [x] 已修正所有 dbCall 使用模式
- [x] 已確認 Pure ASCII 規範
- [x] 已實施欄位檢查機制
- [x] 已調整 Excel 解析為 16 欄
- [x] 已創建容器內測試腳本
- [x] 已準備完整部署腳本
- [x] 已分析所有可能錯誤
- [x] 已準備回滾方案

**可以開始部署！**
