# TaskFlow Pro System Status Check
# Encoding: UTF-8

$ErrorActionPreference = "SilentlyContinue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TaskFlow Pro System Status Check" -ForegroundColor Cyan
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Local Git Status
Write-Host "1. Local Git Status" -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "  [WARN] Uncommitted changes found" -ForegroundColor Yellow
    Write-Host "  Count: $($gitStatus.Count)" -ForegroundColor Gray
} else {
    Write-Host "  [OK] Git status is clean" -ForegroundColor Green
}
$lastCommit = git log -1 --oneline
Write-Host "  Latest Commit: $lastCommit" -ForegroundColor Gray
Write-Host ""

# 2. Check Backend Container
Write-Host "2. Backend Container Status" -ForegroundColor Yellow
$containerStatus = ssh root@165.227.147.40 "docker ps --filter name=taskflow-pro --format '{{.Status}}'"
if ($containerStatus -match "Up") {
    Write-Host "  [OK] Container is running: $containerStatus" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Container is NOT running" -ForegroundColor Red
}
Write-Host ""

# 3. Check Disk Space
Write-Host "3. Server Disk Space" -ForegroundColor Yellow
$diskUsage = ssh root@165.227.147.40 "df -h / | awk 'NR==2 {print \$5}'"
if ($diskUsage) {
    Write-Host "  [INFO] Disk Usage: $diskUsage" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Could not get disk usage" -ForegroundColor Yellow
}
Write-Host ""

# 4. Check Snapshots
Write-Host "4. Backup Snapshots" -ForegroundColor Yellow
$snapshotCount = ssh root@165.227.147.40 "ls /root/taskflow-snapshots/*.tar.gz | wc -l"
if ($snapshotCount -gt 0) {
    Write-Host "  [OK] Snapshots found: $snapshotCount" -ForegroundColor Green
} else {
    Write-Host "  [WARN] No snapshots found" -ForegroundColor Yellow
}
Write-Host ""

# 5. Check Frontend
Write-Host "5. Frontend Status" -ForegroundColor Yellow
try {
    $prod = Invoke-WebRequest -Uri "https://transcendent-basbousa-6df2d2.netlify.app" -Method Head -TimeoutSec 5
    if ($prod.StatusCode -eq 200) {
        Write-Host "  [OK] Production site accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "  [FAIL] Production site inaccessible" -ForegroundColor Red
}
Write-Host ""

Write-Host "Check Complete." -ForegroundColor Cyan
