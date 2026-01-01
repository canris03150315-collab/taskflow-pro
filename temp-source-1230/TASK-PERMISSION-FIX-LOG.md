# 任務權限修復日誌

**日期**: 2025-12-30  
**版本**: v1.2.0  
**狀態**: ✅ 已完成

---

## 📋 問題總覽

本次修復解決了任務權限系統中的多個關鍵問題，確保不同角色的用戶能夠正確查看和操作任務。

### 發現的問題

1. **員工無法看到自己創建的任務**
2. **主管無法看到分配給自己部門的任務**
3. **員工無法接取部門任務**
4. **前端「可接取任務」過濾邏輯不準確**
5. **員工無法看到公開任務**

---

## 🔍 問題分析與解決方案

### 問題 1: 員工無法看到自己創建的任務

#### 症狀
- 員工創建任務後，在「我的任務」中看不到
- 後端查詢邏輯缺少 `created_by` 條件

#### 根本原因
後端 `/app/dist/routes/tasks.js` 中員工查詢邏輯不完整：

```javascript
// ❌ 錯誤
if (currentUser.role === types_1.Role.EMPLOYEE) {
    query += ' AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ?)';
    params.push(currentUser.id, currentUser.department);
}
```

#### 解決方案
使用 Python 腳本精確修改後端文件：

```python
# fix_tasks_precise.py
import re

with open('/app/dist/routes/tasks.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 修復員工查詢邏輯
content = re.sub(
    r"(if \(currentUser\.role === types_1\.Role\.EMPLOYEE\) \{[\s\S]*?)(query \+= ' AND \(t\.assigned_to_user_id = \? OR t\.assigned_to_department = \?\)';[\s\S]*?params\.push\(currentUser\.id, currentUser\.department\);)",
    r"\1query += ' AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ? OR t.created_by = ?)';\n            params.push(currentUser.id, currentUser.department, currentUser.id);",
    content,
    count=1
)

with open('/app/dist/routes/tasks.js', 'w', encoding='utf-8') as f:
    f.write(content)
```

**部署步驟**：
```bash
# 1. 上傳腳本到服務器
scp fix_tasks_precise.py root@165.227.147.40:/tmp/fix_tasks.py

# 2. 複製到容器並執行
docker cp /tmp/fix_tasks.py taskflow-pro:/tmp/fix_tasks.py
docker exec taskflow-pro python3 /tmp/fix_tasks.py

# 3. 重啟容器
docker restart taskflow-pro
```

#### 關鍵學習點
- ✅ **使用 Python 腳本而非 sed**：PowerShell 和 sed 在處理複雜字串替換時容易出錯
- ✅ **正則表達式精確匹配**：確保只修改目標代碼段
- ✅ **先備份再修改**：容器內已有 `tasks.js.backup`

---

### 問題 2: 主管無法看到分配給自己部門的任務

#### 症狀
- 主管只能看到 `target_department` 是自己部門的任務
- 無法看到 `assigned_to_department` 是自己部門的任務

#### 根本原因
後端查詢邏輯混淆了兩個概念：
- `target_department`：任務的目標部門
- `assigned_to_department`：任務分配給的部門

```javascript
// ❌ 錯誤
else if (currentUser.role === types_1.Role.SUPERVISOR) {
    query += ' AND (t.target_department = ? OR t.created_by = ?)';
    params.push(currentUser.department, currentUser.id);
}
```

#### 解決方案
增加 `assigned_to_department` 條件：

```javascript
// ✅ 正確
else if (currentUser.role === types_1.Role.SUPERVISOR) {
    query += ' AND (t.target_department = ? OR t.assigned_to_department = ? OR t.created_by = ?)';
    params.push(currentUser.department, currentUser.department, currentUser.id);
}
```

#### 關鍵學習點
- ✅ **區分業務概念**：`target_department` vs `assigned_to_department`
- ✅ **同步修復 countQuery**：查詢和計數邏輯必須一致

---

### 問題 3: 員工無法接取部門任務

#### 症狀
- 員工可以看到分配給自己部門的任務
- 但無法接取這些任務（權限被拒絕）

#### 根本原因
接取任務的權限檢查過於嚴格：

```javascript
// ❌ 錯誤：只有主管可以接取部門任務
const canAccept = 
    task.status === TaskStatus.OPEN ||
    task.assigned_to_user_id === currentUser.id ||
    (task.assigned_to_department === currentUser.department && 
     currentUser.role === Role.SUPERVISOR);  // ← 問題在這裡
```

#### 解決方案
移除角色限制，允許所有部門成員接取：

```javascript
// ✅ 正確：員工和主管都可以接取部門任務
const canAccept = 
    task.status === TaskStatus.OPEN ||
    task.assigned_to_user_id === currentUser.id ||
    (task.assigned_to_department === currentUser.department);  // ← 移除角色檢查
```

#### 關鍵學習點
- ✅ **權限一致性**：查看權限和操作權限應該匹配
- ✅ **業務邏輯合理性**：部門任務應該允許部門內所有成員接取

---

### 問題 4: 前端「可接取任務」過濾邏輯不準確

#### 症狀
- 「可接取任務」分頁顯示了用戶無法接取的任務
- 過濾邏輯過於簡單

#### 根本原因
前端只檢查任務狀態，未考慮用戶權限：

```javascript
// ❌ 錯誤
filtered = filtered.filter(t => 
    t.status === TaskStatus.OPEN || 
    (t.status === TaskStatus.ASSIGNED && t.assignedToUserId === currentUser.id)
);
```

#### 解決方案
精確過濾可接取的任務：

```javascript
// ✅ 正確
filtered = filtered.filter(t => {
    // 公開任務（未指派給任何人或部門）
    if (t.status === TaskStatus.OPEN && !t.assignedToUserId && !t.assignedToDepartment) {
        return true;
    }
    // 指派給我的任務
    if (t.assignedToUserId === currentUser.id && t.status !== TaskStatus.COMPLETED) {
        return true;
    }
    // 指派給我部門的任務
    if (t.assignedToDepartment === currentUser.department && t.status !== TaskStatus.COMPLETED) {
        return true;
    }
    return false;
});
```

**修改文件**：`C:\Users\USER\Downloads\公司內部\App.tsx` (約 704-720 行)

#### 關鍵學習點
- ✅ **前後端邏輯一致**：前端過濾應該反映後端權限
- ✅ **明確的條件判斷**：避免使用過於簡單的邏輯

---

### 問題 5: 員工無法看到公開任務

#### 症狀
- 員工登入後看不到任何公開任務
- 只能看到分配給自己或自己部門的任務

#### 根本原因
後端查詢邏輯缺少公開任務的條件。公開任務的定義：
- `assigned_to_user_id = NULL`
- `assigned_to_department = NULL`

```javascript
// ❌ 錯誤：缺少公開任務條件
if (currentUser.role === types_1.Role.EMPLOYEE) {
    query += ' AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ? OR t.created_by = ?)';
    params.push(currentUser.id, currentUser.department, currentUser.id);
}
```

#### 解決方案
增加公開任務的 NULL 檢查：

```javascript
// ✅ 正確：包含公開任務
if (currentUser.role === types_1.Role.EMPLOYEE) {
    query += ' AND ((t.assigned_to_user_id IS NULL AND t.assigned_to_department IS NULL) OR t.assigned_to_user_id = ? OR t.assigned_to_department = ? OR t.created_by = ?)';
    params.push(currentUser.id, currentUser.department, currentUser.id);
}
```

**修復腳本**：
```python
# fix_public_tasks.py
content = re.sub(
    r"(if \(currentUser\.role === types_1\.Role\.EMPLOYEE\) \{[\s\S]*?// 員工只能看到分配給自己或自己部門的任務\s*\n\s*)(query \+= ' AND \(t\.assigned_to_user_id = \? OR t\.assigned_to_department = \? OR t\.created_by = \?\)';)",
    r"\1query += ' AND ((t.assigned_to_user_id IS NULL AND t.assigned_to_department IS NULL) OR t.assigned_to_user_id = ? OR t.assigned_to_department = ? OR t.created_by = ?)';",
    content,
    count=1
)
```

#### 關鍵學習點
- ✅ **SQL NULL 檢查**：使用 `IS NULL` 而非 `= NULL`
- ✅ **業務邏輯完整性**：公開任務是基本功能，所有角色都應該能看到
- ✅ **同步修復 countQuery**：確保任務計數正確

---

## 🛠️ 通用解決方案模板

### 修改容器內 JavaScript 文件的標準流程

```bash
# 1. 備份原始文件（如果尚未備份）
docker exec taskflow-pro cp /app/dist/routes/tasks.js /app/dist/routes/tasks.js.backup

# 2. 創建 Python 修復腳本（本地）
# 使用正則表達式精確匹配和替換

# 3. 上傳腳本到服務器
scp fix_script.py root@165.227.147.40:/tmp/fix_script.py

# 4. 複製到容器並執行
docker cp /tmp/fix_script.py taskflow-pro:/tmp/fix_script.py
docker exec taskflow-pro python3 /tmp/fix_script.py

# 5. 驗證修改
docker exec taskflow-pro grep -A 5 "關鍵字" /app/dist/routes/tasks.js

# 6. 重啟容器
docker restart taskflow-pro

# 7. 等待並檢查日誌
sleep 12
docker logs taskflow-pro --tail 20
```

### PowerShell 避坑指南

#### 問題：引號和變數插值衝突
```powershell
# ❌ 錯誤：PowerShell 會解析 $size 為變數
Write-Host "Size: $size MB"

# ✅ 正確：使用字串拼接
$displayText = "Size: " + $size + " MB"
Write-Host $displayText
```

#### 問題：sed 命令在 PowerShell 中失敗
```powershell
# ❌ 錯誤：引號嵌套問題
ssh root@host "docker exec container sed -i 's/old/new/' file"

# ✅ 正確：使用 Python 腳本
# 創建 .py 文件，使用 scp 上傳，在容器內執行
```

#### 問題：Windows 換行符導致 bash 腳本失敗
```powershell
# ❌ 錯誤：直接傳送 .sh 文件
Get-Content script.sh | ssh root@host "bash"

# ✅ 正確：使用 Python 或直接執行命令
# Python 腳本不受換行符影響
```

---

## 📊 最終權限矩陣

| 角色 | 可見任務 | 可接取任務 |
|------|---------|-----------|
| **BOSS** | 所有任務 | 所有任務 |
| **MANAGER** | 所有任務 | 所有任務 |
| **SUPERVISOR** | • 公開任務<br>• 目標部門 = 自己部門<br>• 分配給自己部門<br>• 自己創建的任務 | • 公開任務<br>• 分配給自己的<br>• 分配給自己部門的 |
| **EMPLOYEE** | • **公開任務**<br>• 分配給自己的<br>• 分配給自己部門的<br>• 自己創建的任務 | • 公開任務<br>• 分配給自己的<br>• 分配給自己部門的 |

---

## 🔄 備份規則更新

### 問題
原備份方式會覆蓋同名文件，導致歷史版本丟失。

### 解決方案
使用時間戳命名備份文件：

```powershell
# backup-project.ps1
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupName = "公司內部_${BackupNote}_${timestamp}.zip"
$backupPath = Join-Path $backupDir $backupName
Compress-Archive -Path "$projectPath\*" -DestinationPath $backupPath -Force
```

**使用方式**：
```powershell
# 一般備份
.\backup-project.ps1

# 帶註記備份
.\backup-project.ps1 -BackupNote "permission_fixed"
```

**備份位置**：`C:\Users\USER\Downloads\Backups\`

---

## 📝 部署檢查清單

修改後端代碼時，務必遵循以下步驟：

- [ ] 1. 備份原始文件
- [ ] 2. 使用 Python 腳本進行修改（避免 sed 和 PowerShell 引號問題）
- [ ] 3. 驗證修改內容（使用 grep 檢查）
- [ ] 4. 重啟容器
- [ ] 5. 檢查容器日誌確認正常啟動
- [ ] 6. 測試功能
- [ ] 7. 創建備份（使用時間戳命名）

---

## 🚨 常見錯誤與解決方案

### 錯誤 1: sed 命令修改失敗
**症狀**：執行 sed 後文件內容未改變

**原因**：
- PowerShell 引號嵌套問題
- 正則表達式轉義問題
- 容器內沒有 bash

**解決方案**：改用 Python 腳本

### 錯誤 2: 容器重啟後修改丟失
**症狀**：容器重啟後，修改的文件恢復原狀

**原因**：修改了容器外的文件，而非容器內的文件

**解決方案**：
```bash
# ✅ 正確：修改容器內的文件
docker exec taskflow-pro python3 /tmp/fix_script.py

# ❌ 錯誤：修改宿主機的文件
python3 /tmp/fix_script.py
```

### 錯誤 3: 權限邏輯不一致
**症狀**：用戶能看到任務但無法操作

**原因**：查詢權限和操作權限不匹配

**解決方案**：確保以下邏輯一致
- 查詢任務列表的權限
- 查詢單個任務的權限
- 接取任務的權限
- 更新任務的權限

---

## 📚 相關文件

- **後端路由**：`/app/dist/routes/tasks.js`（容器內）
- **前端主文件**：`C:\Users\USER\Downloads\公司內部\App.tsx`
- **備份腳本**：`C:\Users\USER\Downloads\公司內部\backup-project.ps1`
- **修復腳本**：
  - `fix_tasks_precise.py`
  - `fix_public_tasks.py`

---

## 🎯 未來改進建議

1. **自動化測試**：為權限邏輯添加單元測試
2. **權限配置化**：將權限規則抽取到配置文件
3. **日誌增強**：記錄權限檢查失敗的原因
4. **前端提示**：當用戶無權操作時，顯示明確的提示信息

---

**創建日期**：2025-12-30  
**最後更新**：2025-12-30 03:20  
**版本**：1.0  
**狀態**：✅ 所有問題已解決
