# 獨立資料庫備份腳本
# 用途：快速備份資料庫，不需要完整系統快照

param(
    [string]$BackupName = "manual-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "資料庫備份系統" -ForegroundColor Cyan
Write-Host "備份名稱: $BackupName" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 本地備份目錄
$localBackupDir = "C:\Users\USER\Downloads\TaskFlow-DB-Backups"
if (!(Test-Path $localBackupDir)) {
    New-Item -ItemType Directory -Path $localBackupDir -Force | Out-Null
}

# ============================================
# 第一步：從伺服器備份資料庫
# ============================================
Write-Host "📦 第一步：從伺服器備份資料庫..." -ForegroundColor Yellow

# 觸發容器內備份
Write-Host "  觸發容器內備份..." -ForegroundColor Gray
ssh root@165.227.147.40 "docker exec taskflow-pro node dist/index.js backup" | Out-Null

# 等待備份完成
Start-Sleep -Seconds 2

# 獲取最新的備份文件
Write-Host "  獲取最新備份文件..." -ForegroundColor Gray
$latestBackup = ssh root@165.227.147.40 "ls -t /root/taskflow-data/backups/*.db 2>/dev/null | head -1"

if ($latestBackup) {
    Write-Host "  ✅ 容器內備份完成: $latestBackup" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  容器內備份未找到，嘗試直接複製資料庫..." -ForegroundColor Yellow
    $latestBackup = "/root/taskflow-data/taskflow.db"
}

Write-Host ""

# ============================================
# 第二步：下載到本地
# ============================================
Write-Host "💾 第二步：下載資料庫到本地..." -ForegroundColor Yellow

$localDbPath = Join-Path $localBackupDir "taskflow-$BackupName.db"

# 使用 SSH 複製文件
Write-Host "  正在下載..." -ForegroundColor Gray
$tempFile = [System.IO.Path]::GetTempFileName()
ssh root@165.227.147.40 "cat $latestBackup" > $tempFile
Move-Item $tempFile $localDbPath -Force

if (Test-Path $localDbPath) {
    $fileSize = [math]::Round((Get-Item $localDbPath).Length / 1MB, 2)
    Write-Host "  ✅ 下載完成: $localDbPath" -ForegroundColor Green
    Write-Host "  大小: $fileSize MB" -ForegroundColor Gray
} else {
    Write-Host "  ❌ 下載失敗" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================
# 第三步：創建備份信息文件
# ============================================
Write-Host "📝 第三步：創建備份信息..." -ForegroundColor Yellow

$backupInfo = @"
# 資料庫備份信息

**備份名稱**: $BackupName
**備份時間**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**文件位置**: $localDbPath
**文件大小**: $fileSize MB

---

## 恢復方法

### 方法 1：使用 SSH 恢復到伺服器

``````powershell
# 1. 上傳資料庫到伺服器
`$dbPath = "$localDbPath"
Get-Content `$dbPath -Raw -AsByteStream | ssh root@165.227.147.40 "cat > /root/taskflow-restore.db"

# 2. 停止容器
ssh root@165.227.147.40 "docker stop taskflow-pro"

# 3. 備份當前資料庫
ssh root@165.227.147.40 "cp /root/taskflow-data/taskflow.db /root/taskflow-data/taskflow.db.backup"

# 4. 恢復資料庫
ssh root@165.227.147.40 "cp /root/taskflow-restore.db /root/taskflow-data/taskflow.db"

# 5. 重啟容器
ssh root@165.227.147.40 "docker start taskflow-pro"

# 6. 驗證
ssh root@165.227.147.40 "docker logs taskflow-pro --tail 20"
``````

### 方法 2：本地查看資料庫

``````powershell
# 使用 SQLite 工具查看
# 下載 SQLite Browser: https://sqlitebrowser.org/

# 或使用命令行
sqlite3 "$localDbPath" ".tables"
sqlite3 "$localDbPath" "SELECT COUNT(*) FROM users;"
``````

---

**創建時間**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@

$infoPath = Join-Path $localBackupDir "taskflow-$BackupName-INFO.md"
$backupInfo | Out-File -FilePath $infoPath -Encoding UTF8

Write-Host "  ✅ 備份信息已創建: $infoPath" -ForegroundColor Green

Write-Host ""

# ============================================
# 第四步：清理舊備份（保留最近 30 個）
# ============================================
Write-Host "🧹 第四步：清理舊備份..." -ForegroundColor Yellow

$allBackups = Get-ChildItem $localBackupDir -Filter "taskflow-*.db" | Sort-Object LastWriteTime -Descending
$backupsToKeep = 30

if ($allBackups.Count -gt $backupsToKeep) {
    $backupsToDelete = $allBackups | Select-Object -Skip $backupsToKeep
    foreach ($backup in $backupsToDelete) {
        Remove-Item $backup.FullName -Force
        $infoFile = $backup.FullName -replace '\.db$', '-INFO.md'
        if (Test-Path $infoFile) {
            Remove-Item $infoFile -Force
        }
        Write-Host "  已刪除舊備份: $($backup.Name)" -ForegroundColor Gray
    }
    Write-Host "  ✅ 已清理 $($backupsToDelete.Count) 個舊備份" -ForegroundColor Green
} else {
    Write-Host "  ✅ 當前備份數量: $($allBackups.Count)，無需清理" -ForegroundColor Green
}

Write-Host ""

# ============================================
# 完成總結
# ============================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ 資料庫備份完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📦 備份文件：" -ForegroundColor Cyan
Write-Host "  資料庫: $localDbPath" -ForegroundColor White
Write-Host "  信息: $infoPath" -ForegroundColor White
Write-Host ""
Write-Host "📊 備份統計：" -ForegroundColor Cyan
Write-Host "  本地備份總數: $($allBackups.Count)" -ForegroundColor White
Write-Host "  最新備份大小: $fileSize MB" -ForegroundColor White
Write-Host ""
Write-Host "📝 查看恢復方法: $infoPath" -ForegroundColor Yellow
Write-Host ""
