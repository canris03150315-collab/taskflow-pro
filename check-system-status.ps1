# TaskFlow Pro 系統狀態檢查腳本
# 用途：快速檢查整個系統的狀態

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TaskFlow Pro 系統狀態檢查" -ForegroundColor Cyan
Write-Host "時間: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 檢查本地 Git 狀態
Write-Host "📁 本地 Git 狀態" -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "  ⚠️  有未提交的變更" -ForegroundColor Yellow
    Write-Host "  變更數量: $($gitStatus.Count)" -ForegroundColor Gray
} else {
    Write-Host "  ✅ Git 狀態乾淨" -ForegroundColor Green
}

$lastCommit = git log -1 --oneline
Write-Host "  最新 Commit: $lastCommit" -ForegroundColor Gray
Write-Host ""

# 檢查後端容器狀態
Write-Host "🐳 後端容器狀態" -ForegroundColor Yellow
try {
    $containerStatus = ssh root@165.227.147.40 "docker ps --filter name=taskflow-pro --format '{{.Status}}'" 2>$null
    if ($containerStatus -match "Up") {
        Write-Host "  ✅ 容器運行中: $containerStatus" -ForegroundColor Green
    } else {
        Write-Host "  ❌ 容器未運行" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ 無法連接到伺服器" -ForegroundColor Red
}
Write-Host ""

# 檢查磁碟空間
Write-Host "💾 伺服器磁碟空間" -ForegroundColor Yellow
try {
    $diskUsage = ssh root@165.227.147.40 "df -h / | grep /dev/vda1 | awk '{print \`$5}'" 2>$null
    $diskUsageNum = [int]($diskUsage -replace '%', '')
    if ($diskUsageNum -lt 80) {
        Write-Host "  ✅ 磁碟使用率: $diskUsage" -ForegroundColor Green
    } elseif ($diskUsageNum -lt 90) {
        Write-Host "  ⚠️  磁碟使用率: $diskUsage" -ForegroundColor Yellow
    } else {
        Write-Host "  ❌ 磁碟使用率: $diskUsage (需要清理)" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ 無法檢查磁碟空間" -ForegroundColor Red
}
Write-Host ""

# 檢查快照數量
Write-Host "📦 備份快照狀態" -ForegroundColor Yellow
try {
    $snapshotCount = ssh root@165.227.147.40 "ls /root/taskflow-snapshots/*.tar.gz 2>/dev/null | wc -l" 2>$null
    if ($snapshotCount -gt 0) {
        Write-Host "  ✅ 快照數量: $snapshotCount 個" -ForegroundColor Green
        if ($snapshotCount -gt 15) {
            Write-Host "  ⚠️  建議清理舊快照（保留最新 10 個）" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠️  沒有快照" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ 無法檢查快照" -ForegroundColor Red
}
Write-Host ""

# 檢查前端狀態
Write-Host "🌐 前端部署狀態" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://transcendent-basbousa-6df2d2.netlify.app" -Method Head -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ 生產環境可訪問" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ 生產環境無法訪問" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "https://bejewelled-shortbread-a1aa30.netlify.app" -Method Head -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ 測試環境可訪問" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠️  測試環境無法訪問" -ForegroundColor Yellow
}
Write-Host ""

# 檢查本地備份
Write-Host "💾 本地備份狀態" -ForegroundColor Yellow
$localBackupDir = "C:\Users\USER\Downloads\TaskFlow-DB-Backups"
if (Test-Path $localBackupDir) {
    $backups = Get-ChildItem $localBackupDir -Filter "*.db" | Sort-Object LastWriteTime -Descending
    if ($backups.Count -gt 0) {
        $latestBackup = $backups[0]
        $backupAge = (Get-Date) - $latestBackup.LastWriteTime
        Write-Host "  ✅ 最新備份: $($latestBackup.Name)" -ForegroundColor Green
        Write-Host "  時間: $($latestBackup.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Gray
        Write-Host "  距今: $([math]::Round($backupAge.TotalHours, 1)) 小時" -ForegroundColor Gray
        
        if ($backupAge.TotalHours -gt 24) {
            Write-Host "  ⚠️  備份超過 24 小時，建議重新備份" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠️  沒有本地備份" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  本地備份目錄不存在" -ForegroundColor Yellow
}
Write-Host ""

# 總結
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "檢查完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 建議操作:" -ForegroundColor Yellow
if ($gitStatus) {
    Write-Host "  - 提交未提交的變更: git add . ; git commit -m '描述'" -ForegroundColor White
}
if ($snapshotCount -gt 15) {
    Write-Host "  - 清理舊快照: ssh root@165.227.147.40 'cd /root/taskflow-snapshots ; ls -t *.tar.gz | tail -n +11 | xargs rm -f'" -ForegroundColor White
}
if ($backupAge.TotalHours -gt 24) {
    Write-Host "  - 創建新備份: .\backup-database.ps1" -ForegroundColor White
}
Write-Host ""
