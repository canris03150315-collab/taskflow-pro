# 備份規則說明

**生效日期**: 2025-12-30  
**版本**: 1.0

---

## 📋 備份原則

### ⚠️ 重要規則

**只有在用戶明確說出「功能正常」後，AI 才可以執行備份。**

在此之前，AI 不應該：
- ❌ 自動執行備份
- ❌ 在修復完成後立即備份
- ❌ 在部署完成後立即備份
- ❌ 在測試完成後立即備份

---

## ✅ 正確的備份流程

1. **完成修復/開發工作**
2. **等待用戶測試**
3. **用戶確認「功能正常」**
4. **執行備份**

---

## 🔧 手動備份指令

當用戶確認功能正常後，使用以下指令執行備份：

### 一般備份
```powershell
.\backup-project.ps1
```

### 帶版本註記的備份
```powershell
.\backup-project.ps1 -BackupNote "v2.2.0"
```

### 帶功能說明的備份
```powershell
.\backup-project.ps1 -BackupNote "chat_system_fixed"
```

### 快速備份（單行命令）
```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"; $backupDir = "C:\Users\USER\Downloads\Backups"; $backupPath = "$backupDir\公司內部_backup_$timestamp.zip"; Compress-Archive -Path "C:\Users\USER\Downloads\公司內部\*" -DestinationPath $backupPath -CompressionLevel Fastest -Force; Get-Item $backupPath | Select-Object Name, @{Name="SizeMB";Expression={[math]::Round($_.Length/1MB,2)}}, LastWriteTime
```

---

## 📦 備份位置

- **備份目錄**: `C:\Users\USER\Downloads\Backups\`
- **命名格式**: `公司內部_[註記]_YYYYMMDD_HHMMSS.zip`
- **保留策略**: 保留所有備份，不自動刪除

---

## 💡 備份最佳實踐

### 建議備份時機
- ✅ 完成重要功能開發並測試通過後
- ✅ 修復關鍵 bug 並確認正常後
- ✅ 版本發布前
- ✅ 重大變更前（作為回滾點）

### 備份註記建議
- 版本號：`v2.2.0`, `v2.3.0`
- 功能名稱：`chat_system`, `task_permission`
- 狀態說明：`before_refactor`, `after_fix`
- 日期標記：已自動包含在檔名中

---

## 🚨 緊急恢復

如需恢復到某個備份：

```powershell
# 1. 查看所有備份
Get-ChildItem "C:\Users\USER\Downloads\Backups\" -Filter "公司內部*.zip" | Sort-Object LastWriteTime -Descending | Select-Object Name, @{Name="SizeMB";Expression={[math]::Round($_.Length/1MB,2)}}, LastWriteTime

# 2. 解壓縮到臨時目錄查看
Expand-Archive -Path "C:\Users\USER\Downloads\Backups\公司內部_xxx.zip" -DestinationPath "C:\Users\USER\Downloads\Temp" -Force

# 3. 確認後覆蓋當前專案（謹慎操作）
Remove-Item "C:\Users\USER\Downloads\公司內部\*" -Recurse -Force
Expand-Archive -Path "C:\Users\USER\Downloads\Backups\公司內部_xxx.zip" -DestinationPath "C:\Users\USER\Downloads\公司內部" -Force
```

---

## 📊 備份管理

### 查看備份列表
```powershell
Get-ChildItem "C:\Users\USER\Downloads\Backups\" -Filter "公司內部*.zip" | Sort-Object LastWriteTime -Descending | Format-Table Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB,2)}}, LastWriteTime -AutoSize
```

### 清理舊備份（手動）
```powershell
# 刪除 30 天前的備份
$cutoffDate = (Get-Date).AddDays(-30)
Get-ChildItem "C:\Users\USER\Downloads\Backups\" -Filter "公司內部*.zip" | Where-Object { $_.LastWriteTime -lt $cutoffDate } | Remove-Item -Confirm
```

### 計算備份總大小
```powershell
$totalSize = (Get-ChildItem "C:\Users\USER\Downloads\Backups\" -Filter "公司內部*.zip" | Measure-Object -Property Length -Sum).Sum
Write-Host "備份總大小: $([math]::Round($totalSize/1MB, 2)) MB"
```

---

**重要提醒**：AI 必須等待用戶明確說出「功能正常」後才執行備份！

---

*創建日期：2025-12-30*  
*最後更新：2025-12-30*
