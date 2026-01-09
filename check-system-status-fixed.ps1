# TaskFlow Pro System Status Check Script
# Purpose: Quick check of entire system status

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TaskFlow Pro System Status Check" -ForegroundColor Cyan
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check local Git status
Write-Host "Git Status" -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "  WARNING: Uncommitted changes" -ForegroundColor Yellow
    Write-Host "  Changes count: $($gitStatus.Count)" -ForegroundColor Gray
} else {
    Write-Host "  OK: Git status clean" -ForegroundColor Green
}

$lastCommit = git log -1 --oneline
Write-Host "  Latest commit: $lastCommit" -ForegroundColor Gray
Write-Host ""

# Check backend container status
Write-Host "Backend Container Status" -ForegroundColor Yellow
try {
    $containerStatus = ssh root@165.227.147.40 "docker ps --filter name=taskflow-pro --format '{{.Status}}'" 2>$null
    if ($containerStatus -match "Up") {
        Write-Host "  OK: Container running - $containerStatus" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: Container not running" -ForegroundColor Red
    }
} catch {
    Write-Host "  ERROR: Cannot connect to server" -ForegroundColor Red
}
Write-Host ""

# Check disk space
Write-Host "Server Disk Space" -ForegroundColor Yellow
try {
    $diskUsage = ssh root@165.227.147.40 "df -h / | grep /dev/vda1 | awk '{print `$5}'" 2>$null
    $diskUsageNum = [int]($diskUsage -replace '%', '')
    if ($diskUsageNum -lt 80) {
        Write-Host "  OK: Disk usage - $diskUsage" -ForegroundColor Green
    } elseif ($diskUsageNum -lt 90) {
        Write-Host "  WARNING: Disk usage - $diskUsage" -ForegroundColor Yellow
    } else {
        Write-Host "  ERROR: Disk usage - $diskUsage (cleanup needed)" -ForegroundColor Red
    }
} catch {
    Write-Host "  ERROR: Cannot check disk space" -ForegroundColor Red
}
Write-Host ""

# Check snapshot count
Write-Host "Backup Snapshot Status" -ForegroundColor Yellow
try {
    $snapshotCount = ssh root@165.227.147.40 "ls /root/taskflow-snapshots/*.tar.gz 2>/dev/null | wc -l" 2>$null
    if ($snapshotCount -gt 0) {
        Write-Host "  OK: Snapshot count - $snapshotCount" -ForegroundColor Green
        if ($snapshotCount -gt 15) {
            Write-Host "  WARNING: Consider cleaning old snapshots (keep latest 10)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  WARNING: No snapshots found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ERROR: Cannot check snapshots" -ForegroundColor Red
}
Write-Host ""

# Check frontend status
Write-Host "Frontend Deployment Status" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://transcendent-basbousa-6df2d2.netlify.app" -Method Head -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "  OK: Production environment accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "  ERROR: Production environment not accessible" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "https://bejewelled-shortbread-a1aa30.netlify.app" -Method Head -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "  OK: Test environment accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "  WARNING: Test environment not accessible" -ForegroundColor Yellow
}
Write-Host ""

# Check local backups
Write-Host "Local Backup Status" -ForegroundColor Yellow
$localBackupDir = "C:\Users\USER\Downloads\TaskFlow-DB-Backups"
if (Test-Path $localBackupDir) {
    $backups = Get-ChildItem $localBackupDir -Filter "*.db" | Sort-Object LastWriteTime -Descending
    if ($backups.Count -gt 0) {
        $latestBackup = $backups[0]
        $backupAge = (Get-Date) - $latestBackup.LastWriteTime
        Write-Host "  OK: Latest backup - $($latestBackup.Name)" -ForegroundColor Green
        Write-Host "  Time: $($latestBackup.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Gray
        Write-Host "  Age: $([math]::Round($backupAge.TotalHours, 1)) hours" -ForegroundColor Gray
        
        if ($backupAge.TotalHours -gt 24) {
            Write-Host "  WARNING: Backup older than 24 hours, consider new backup" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  WARNING: No local backups" -ForegroundColor Yellow
    }
} else {
    Write-Host "  WARNING: Local backup directory does not exist" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Check Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Recommended Actions:" -ForegroundColor Yellow
if ($gitStatus) {
    Write-Host "  - Commit changes: git add . ; git commit -m 'description'" -ForegroundColor White
}
if ($snapshotCount -gt 15) {
    Write-Host "  - Clean old snapshots: ssh root@165.227.147.40 'cd /root/taskflow-snapshots ; ls -t *.tar.gz | tail -n +11 | xargs rm -f'" -ForegroundColor White
}
if ($backupAge.TotalHours -gt 24) {
    Write-Host "  - Create new backup: .\backup-database.ps1" -ForegroundColor White
}
Write-Host ""
