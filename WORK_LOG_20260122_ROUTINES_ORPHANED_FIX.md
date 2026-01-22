# 每日任務孤兒記錄修復工作日誌

**日期**: 2026-01-22  
**版本**: v8.9.155  
**狀態**: ✅ 部分修復完成

---

## 🔍 問題描述

用戶反映兩個問題：
1. **刪除每日任務後儀表板仍顯示**
2. **同部門用戶看到不同的每日任務**

---

## 📊 診斷結果

### 問題 1：孤兒記錄

**根本原因**：
- 刪除每日任務模板後，`routine_records` 表中的記錄未被清理
- 這些「孤兒記錄」導致儀表板仍顯示已刪除的任務

**發現的孤兒記錄**：
1. Se7en (cbsv402gc) - 2026-01-10
2. 錢來也 (j06ng7vy3) - 2026-01-12
3. Se7en (cbsv402gc) - 2026-01-13
4. Seven (Management) - 2026-01-21

**總計**: 4 條孤兒記錄

---

## 🔧 修復方案

### 步驟 1：創建清理腳本

**文件**: `fix-orphaned-routine-records.js`

```javascript
const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

// Get all templates
const templates = db.prepare('SELECT * FROM routine_templates').all();
const templateDepts = new Set(templates.filter(t => t.is_daily === 1).map(t => t.department_id));

// Delete orphaned records
const deleteStmt = db.prepare('DELETE FROM routine_records WHERE department_id NOT IN (SELECT department_id FROM routine_templates WHERE is_daily = 1)');
const result = deleteStmt.run();

console.log(`✅ Deleted ${result.changes} orphaned records`);
db.close();
```

### 步驟 2：執行清理

```bash
# 上傳腳本
scp fix-orphaned-routine-records.js root@165.227.147.40:/root/fix-orphaned.js

# 執行清理
ssh root@165.227.147.40 "docker cp /root/fix-orphaned.js taskflow-pro:/app/fix-orphaned.js && docker exec taskflow-pro node /app/fix-orphaned.js"

# 結果: ✅ Deleted 4 orphaned records
```

### 步驟 3：重啟容器

```bash
ssh root@165.227.147.40 "docker restart taskflow-pro"
```

### 步驟 4：創建新映像和快照

```bash
# 創建新映像
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v8.9.155-routines-orphaned-fix"

# 創建快照
ssh root@165.227.147.40 "/root/create-snapshot.sh v8.9.155-routines-orphaned-fix-complete"
```

---

## ✅ 修復效果

### 問題 1：孤兒記錄
- **修復前**: 刪除模板後儀表板仍顯示任務
- **修復後**: 孤兒記錄已清理，儀表板應不再顯示已刪除的任務

### 問題 2：同部門不同任務
- **狀態**: 需要進一步診斷
- **下一步**: 檢查 DEPT_63 (j06ng7vy3) 的詳細情況

---

## 📋 問題 2 診斷

### DEPT_63 用戶情況
- NANA：顯示「今日尚未開始每日任務」
- 阿德：顯示 3 項任務（0%）
- 茉莉：顯示 3 項任務（33%）

### 可能原因
1. NANA 沒有今日記錄
2. 前端渲染邏輯問題
3. 部門選擇器導致數據不同步

---

## 🎯 最終版本

- **後端映像**: `taskflow-pro:v8.9.155-routines-orphaned-fix`
- **快照**: `taskflow-snapshot-v8.9.155-routines-orphaned-fix-complete-XXXXXX.tar.gz`
- **前端**: 無需修改
- **資料庫**: 保持完整（刪除 4 條孤兒記錄）

---

## 🔄 待辦事項

- [ ] 用戶測試問題 1 是否修復
- [ ] 診斷問題 2 的根本原因
- [ ] 如需修復問題 2，創建新版本
- [ ] 更新 WORK_LOG_CURRENT.md

---

## 📝 關鍵教訓

1. **刪除模板時必須同時清理相關記錄**
2. **需要添加級聯刪除機制**
3. **定期清理孤兒記錄**

---

**最後更新**: 2026-01-22 03:30  
**狀態**: 🔄 部分完成，等待用戶測試
