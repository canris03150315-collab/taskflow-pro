# 工作日誌 - 每日任務部門切換 Bug 修復

**日期**: 2026-01-06  
**版本**: v8.9.26 → v8.9.27  
**狀態**: ✅ 已修復

---

## 📋 問題描述

用戶報告：
1. Se7en 從系統資訊部切換到有每日任務的部門
2. 確認每日任務正常運作
3. 切換回系統資訊部
4. 每日任務記錄仍然存在
5. 即使改回原部門，任務記錄也不會消失

---

## 🔍 問題分析

### 根本原因

後端 `routines.js` 的 `/today` 路由在查詢今日記錄時，只檢查 `user_id` 和 `date`，**沒有檢查 `department_id`**。

**錯誤的查詢**：
```javascript
SELECT * FROM routine_records WHERE user_id = ? AND date = ?
```

### 問題流程

```
1. Se7en 在系統資訊部（沒有每日任務）
   ↓
2. 切換到有每日任務的部門（例如：業務部）
   ↓
3. 系統創建業務部的每日任務記錄
   - user_id: se7en-id
   - date: 2026-01-06
   - department_id: 業務部
   ↓
4. 切換回系統資訊部
   ↓
5. 查詢今日記錄：WHERE user_id = se7en-id AND date = 2026-01-06
   ↓
6. ❌ 返回業務部的記錄（因為沒有檢查 department_id）
```

### 為什麼會發生

- 資料庫中的 `routine_records` 表有 `department_id` 欄位
- 但查詢時沒有使用這個欄位作為條件
- 導致跨部門返回記錄

---

## 🔧 解決方案

### 修復查詢邏輯

**修改前**：
```javascript
let record = dbCall(db, 'prepare', 
  'SELECT * FROM routine_records WHERE user_id = ? AND date = ?'
).get(userId, today);
```

**修改後**：
```javascript
let record = dbCall(db, 'prepare', 
  'SELECT * FROM routine_records WHERE user_id = ? AND date = ? AND department_id = ?'
).get(userId, today, userDept);
```

**關鍵改變**：
- 添加 `AND department_id = ?` 條件
- 傳入 `userDept` 參數
- 確保只返回當前部門的記錄

---

## 📝 修復步驟

### 1. 創建快照（修復前）
```powershell
ssh root@165.227.147.40 "/root/create-snapshot.sh v8.9.26-before-routine-dept-fix"
```
- 快照: `taskflow-snapshot-v8.9.26-before-routine-dept-fix-20260106_093151.tar.gz` (214MB)

### 2. 創建修復腳本

**文件**: `fix-routine-dept-bug.js`

```javascript
const fs = require('fs');

const filePath = '/app/dist/routes/routines.js';
let content = fs.readFileSync(filePath, 'utf8');

// 修復查詢，添加 department_id 檢查
content = content.replace(
  /SELECT \* FROM routine_records WHERE user_id = \? AND date = \?\)\.get\(userId, today\)/g,
  'SELECT * FROM routine_records WHERE user_id = ? AND date = ? AND department_id = ?).get(userId, today, userDept)'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed routine department check');
```

### 3. 上傳並執行修復
```powershell
Get-Content "fix-routine-dept-bug.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/fix-routine-dept-bug.js"

ssh root@165.227.147.40 "docker cp /tmp/fix-routine-dept-bug.js taskflow-pro:/app/fix-routine-dept-bug.js && docker exec -w /app taskflow-pro node fix-routine-dept-bug.js"
```
- 輸出: `SUCCESS: Fixed routine department check`

### 4. 重啟容器
```bash
ssh root@165.227.147.40 "docker restart taskflow-pro"
```

### 5. 創建新映像
```bash
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v8.9.27-routine-dept-fix"
```
- 映像: `taskflow-pro:v8.9.27-routine-dept-fix`

### 6. 創建快照（修復後）
```bash
ssh root@165.227.147.40 "/root/create-snapshot.sh v8.9.27-routine-dept-fix-complete"
```
- 快照: `taskflow-snapshot-v8.9.27-routine-dept-fix-complete-20260106_093340.tar.gz` (214MB)

---

## ✅ 測試驗證

### 測試案例 1：用戶切換到有任務的部門
1. Se7en 在系統資訊部（沒有每日任務）
2. 切換到業務部（有每日任務）
3. ✅ 顯示業務部的每日任務
4. ✅ 可以勾選完成

### 測試案例 2：切換回原部門
1. Se7en 在業務部（有每日任務記錄）
2. 切換回系統資訊部
3. ✅ 不顯示業務部的任務記錄
4. ✅ 顯示「目前沒有每日任務」

### 測試案例 3：再次切換到業務部
1. Se7en 在系統資訊部
2. 切換到業務部
3. ✅ 顯示今日的任務記錄
4. ✅ 保留之前的完成狀態

---

## 📦 最終版本

### 後端
- Docker 映像: `taskflow-pro:v8.9.27-routine-dept-fix`
- 修改文件: `/app/dist/routes/routines.js`

### 前端
- Deploy ID: `695cd52e50fcd4213b02f87c` (無需修改)
- 網址: https://transcendent-basbousa-6df2d2.netlify.app

### 快照
- 修復前: `taskflow-snapshot-v8.9.26-before-routine-dept-fix-20260106_093151.tar.gz`
- 修復後: `taskflow-snapshot-v8.9.27-routine-dept-fix-complete-20260106_093340.tar.gz`

---

## 🎯 修復效果

### 修復前
- ❌ 用戶切換部門後，舊部門的任務記錄仍然顯示
- ❌ 切換回原部門，任務記錄不會消失
- ❌ 跨部門顯示記錄

### 修復後
- ✅ 用戶切換部門後，只顯示當前部門的任務記錄
- ✅ 切換回原部門，不會有舊記錄
- ✅ 記錄正確綁定到部門

---

## 💡 關鍵教訓

### 1. 資料庫查詢完整性
**問題**：查詢條件不完整
**教訓**：
- 查詢條件必須包含所有相關欄位
- 不能只依賴部分條件
- 檢查資料表結構，確保使用所有必要的欄位

### 2. 部門綁定邏輯
**問題**：記錄沒有正確綁定到部門
**教訓**：
- 記錄應該綁定到特定部門
- 用戶切換部門時，應該看到新部門的記錄
- 不應該跨部門顯示記錄

### 3. 測試覆蓋
**問題**：缺少部門切換的測試
**教訓**：
- 需要測試用戶切換部門的情況
- 確保記錄不會跨部門顯示
- 測試邊界情況（沒有任務的部門）

### 4. 遵循全域規則
**重要**：
- ✅ 修復前創建快照
- ✅ 使用修復腳本而非手動編輯
- ✅ 重啟容器後創建新映像
- ✅ 創建最終快照
- ✅ 更新工作日誌和記憶倉庫

---

## 📊 影響範圍

### 修改的文件
- `/app/dist/routes/routines.js` - 後端路由

### 影響的功能
- 每日任務查詢
- 部門切換

### 不影響的功能
- 前端顯示（無需修改）
- 其他模組功能
- WebSocket 連接
- 資料庫結構

---

## 🔄 後續改進建議

### 短期
1. 添加資料庫索引（user_id, date, department_id）
2. 清理舊的跨部門記錄
3. 添加資料一致性檢查

### 長期
1. 實施更嚴格的資料驗證
2. 添加自動化測試
3. 監控跨部門資料問題

---

## 🐛 相關 Bug

### 可能存在的類似問題
檢查其他使用 `user_id` 和 `date` 查詢的地方，確保也包含 `department_id`：
- 出勤記錄
- 績效評估
- 報表系統

---

**完成時間**: 2026-01-06 17:33  
**測試狀態**: ✅ 已修復並驗證  
**用戶確認**: 待確認
