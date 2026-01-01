# TaskFlow Pro 專案備份腳本
# 使用時間戳命名，不覆蓋舊備份

param(
    [string]$BackupNote = ""
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$projectPath = "C:\Users\USER\Downloads\公司內部"
$backupDir = "C:\Users\USER\Downloads\Backups"

# 創建備份目錄（如果不存在）
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Host "✓ 創建備份目錄: $backupDir" -ForegroundColor Green
}

# 生成備份文件名
if ($BackupNote) {
    $backupName = "公司內部_${BackupNote}_${timestamp}.zip"
} else {
    $backupName = "公司內部_backup_${timestamp}.zip"
}

$backupPath = Join-Path $backupDir $backupName

# 執行備份
Write-Host "正在備份專案..." -ForegroundColor Cyan
Write-Host "來源: $projectPath" -ForegroundColor Gray
Write-Host "目標: $backupPath" -ForegroundColor Gray

try {
    Compress-Archive -Path "$projectPath\*" -DestinationPath $backupPath -CompressionLevel Fastest -Force
    
    # 顯示備份信息
    $backupFile = Get-Item $backupPath
    $sizeMB = [math]::Round($backupFile.Length / 1MB, 2)
    
    Write-Host ""
    Write-Host "✅ 備份完成！" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "檔名: $($backupFile.Name)" -ForegroundColor White
    Write-Host "大小: ${sizeMB} MB" -ForegroundColor White
    Write-Host "時間: $($backupFile.LastWriteTime)" -ForegroundColor White
    Write-Host "路徑: $($backupFile.FullName)" -ForegroundColor Gray
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    
    # 列出所有備份
    $allBackups = Get-ChildItem $backupDir -Filter "公司內部*.zip" | Sort-Object LastWriteTime -Descending
    Write-Host ""
    Write-Host "📦 現有備份 (共 $($allBackups.Count) 個):" -ForegroundColor Cyan
    $allBackups | Select-Object -First 5 | ForEach-Object {
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        $displayText = "  • " + $_.Name + " (" + $sizeMB + " MB) - " + $_.LastWriteTime
        Write-Host $displayText -ForegroundColor Gray
    }
    
    if ($allBackups.Count -gt 5) {
        Write-Host "  ... 還有 $($allBackups.Count - 5) 個較舊的備份" -ForegroundColor DarkGray
    }
    
    # 清理超過 10 個的舊備份（可選）
    if ($allBackups.Count -gt 10) {
        Write-Host ""
        Write-Host "⚠️  發現超過 10 個備份，建議清理舊備份以節省空間" -ForegroundColor Yellow
        $oldBackups = $allBackups | Select-Object -Skip 10
        Write-Host "可刪除的舊備份:" -ForegroundColor Yellow
        $oldBackups | ForEach-Object {
            Write-Host "  • $($_.Name)" -ForegroundColor DarkGray
        }
    }
    
} catch {
    Write-Host "❌ 備份失敗: $_" -ForegroundColor Red
    exit 1
}

# 使用範例
Write-Host ""
Write-Host "💡 使用範例:" -ForegroundColor Cyan
Write-Host "  .\backup-project.ps1                    # 一般備份" -ForegroundColor Gray
Write-Host "  .\backup-project.ps1 -BackupNote 'v1.0' # 帶註記的備份" -ForegroundColor Gray
