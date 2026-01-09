# TaskFlow Pro 完整備份腳本
# 包含：後端快照 + 前端 Git 備份 + 本地代碼備份

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [string]$Description = ""
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$projectPath = $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TaskFlow Pro 完整備份系統" -ForegroundColor Cyan
Write-Host "版本: $Version" -ForegroundColor Cyan
Write-Host "時間: $timestamp" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# 第一步：Git 提交（確保本地代碼已保存）
# ============================================
Write-Host "📝 第一步：Git 提交本地代碼..." -ForegroundColor Yellow

Set-Location $projectPath

# 檢查是否有未提交的變更
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "發現未提交的變更，正在提交..." -ForegroundColor Yellow
    git add .
    $commitMessage = "備份 $Version - $Description - $timestamp"
    git commit -m $commitMessage
    Write-Host "✅ Git 提交完成" -ForegroundColor Green
} else {
    Write-Host "✅ 沒有未提交的變更" -ForegroundColor Green
}

# 創建 Git tag
$tagName = "backup-$Version-$timestamp"
git tag -a $tagName -m "備份標籤: $Version - $Description"
Write-Host "✅ 已創建 Git tag: $tagName" -ForegroundColor Green

Write-Host ""

# ============================================
# 第二步：本地代碼備份
# ============================================
Write-Host "💾 第二步：本地代碼備份..." -ForegroundColor Yellow

$localBackupDir = "C:\Users\USER\Downloads\TaskFlow-Backups"
$localBackupName = "frontend-$Version-$timestamp"
$localBackupPath = Join-Path $localBackupDir $localBackupName

# 創建備份目錄
if (!(Test-Path $localBackupDir)) {
    New-Item -ItemType Directory -Path $localBackupDir -Force | Out-Null
}

# 複製源代碼（排除 node_modules 和 dist）
Write-Host "正在複製源代碼..." -ForegroundColor Gray
$sourceDir = $projectPath
$excludeDirs = @('node_modules', 'dist', '.git', 'temp-*', 'backups')

# 使用 robocopy 進行高效複製
$excludeArgs = $excludeDirs | ForEach-Object { "/XD `"$_`"" }
$robocopyCmd = "robocopy `"$sourceDir`" `"$localBackupPath`" /E /NFL /NDL /NJH /NJS $excludeArgs"
Invoke-Expression $robocopyCmd | Out-Null

# 壓縮備份
Write-Host "正在壓縮備份..." -ForegroundColor Gray
$zipPath = "$localBackupPath.zip"
Compress-Archive -Path $localBackupPath -DestinationPath $zipPath -Force
Remove-Item -Recurse -Force $localBackupPath

Write-Host "✅ 本地代碼備份完成: $zipPath" -ForegroundColor Green
Write-Host "   大小: $([math]::Round((Get-Item $zipPath).Length / 1MB, 2)) MB" -ForegroundColor Gray

Write-Host ""

# ============================================
# 第三步：後端快照（Docker + 資料庫）
# ============================================
Write-Host "🐳 第三步：後端系統快照..." -ForegroundColor Yellow

Write-Host "正在創建後端快照..." -ForegroundColor Gray
$snapshotResult = ssh root@165.227.147.40 "/root/create-snapshot.sh $Version-$timestamp"
Write-Host $snapshotResult

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 後端快照創建完成" -ForegroundColor Green
} else {
    Write-Host "❌ 後端快照創建失敗" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================
# 第四步：記錄 Netlify Deploy ID
# ============================================
Write-Host "🌐 第四步：記錄 Netlify 部署信息..." -ForegroundColor Yellow

$deployInfo = @"
# Netlify 部署信息

**版本**: $Version
**時間**: $timestamp
**描述**: $Description

## 當前部署
- **Site ID**: 5bb6a0c9-3186-4d11-b9be-07bdce7bf186
- **URL**: https://transcendent-basbousa-6df2d2.netlify.app

## 獲取當前 Deploy ID
``````powershell
netlify api listSiteDeploys --data='{\"site_id\": \"5bb6a0c9-3186-4d11-b9be-07bdce7bf186\"}' | ConvertFrom-Json | Select-Object -First 1 | Select-Object id, state, published_at
``````

## 恢復到此版本
``````powershell
netlify api restoreSiteDeploy --data='{\"site_id\": \"5bb6a0c9-3186-4d11-b9be-07bdce7bf186\", \"deploy_id\": \"<DEPLOY_ID>\"}'
``````
"@

$deployInfoPath = Join-Path $localBackupDir "netlify-deploy-$Version-$timestamp.md"
$deployInfo | Out-File -FilePath $deployInfoPath -Encoding UTF8

Write-Host "✅ Netlify 部署信息已保存: $deployInfoPath" -ForegroundColor Green

Write-Host ""

# ============================================
# 第五步：創建備份清單
# ============================================
Write-Host "📋 第五步：創建備份清單..." -ForegroundColor Yellow

$manifest = @"
# TaskFlow Pro 完整備份清單

**版本**: $Version
**時間**: $timestamp
**描述**: $Description

---

## 📦 備份內容

### 1. Git 倉庫
- **Tag**: $tagName
- **Commit**: $(git rev-parse HEAD)
- **Branch**: $(git branch --show-current)

### 2. 本地代碼備份
- **文件**: $zipPath
- **大小**: $([math]::Round((Get-Item $zipPath).Length / 1MB, 2)) MB

### 3. 後端快照
- **位置**: /root/taskflow-snapshots/taskflow-snapshot-$Version-$timestamp.tar.gz
- **內容**: Docker 映像 + 資料庫 + 配置文件

### 4. Netlify 部署
- **信息文件**: $deployInfoPath

---

## 🔄 完整恢復流程

### 恢復本地代碼
``````powershell
# 1. 從 Git 恢復
cd "c:\Users\USER\Downloads\公司內部"
git checkout $tagName

# 2. 或從 zip 恢復
Expand-Archive -Path "$zipPath" -DestinationPath "c:\Users\USER\Downloads\公司內部-restored"
``````

### 恢復後端
``````bash
# 1. SSH 到伺服器
ssh root@165.227.147.40

# 2. 解壓快照
cd /root/taskflow-snapshots
tar -xzf taskflow-snapshot-$Version-$timestamp.tar.gz
cd taskflow-snapshot-$Version-$timestamp

# 3. 停止當前容器
docker stop taskflow-pro
docker rm taskflow-pro

# 4. 載入映像
docker load < docker-image.tar

# 5. 恢復資料庫
mkdir -p /root/taskflow-data-restored
cp taskflow.db /root/taskflow-data-restored/
cp .db-key /root/taskflow-data-restored/

# 6. 啟動容器
docker run -d --name taskflow-pro -p 3000:3000 -p 3001:3001 \
  -e PORT=3000 \
  -v /root/taskflow-data-restored:/app/data \
  taskflow-pro:latest
``````

### 恢復前端
參考 $deployInfoPath

---

**創建時間**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@

$manifestPath = Join-Path $localBackupDir "BACKUP-MANIFEST-$Version-$timestamp.md"
$manifest | Out-File -FilePath $manifestPath -Encoding UTF8

Write-Host "✅ 備份清單已創建: $manifestPath" -ForegroundColor Green

Write-Host ""

# ============================================
# 完成總結
# ============================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ 完整備份已完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📦 備份內容：" -ForegroundColor Cyan
Write-Host "  1. Git Tag: $tagName" -ForegroundColor White
Write-Host "  2. 本地代碼: $zipPath" -ForegroundColor White
Write-Host "  3. 後端快照: /root/taskflow-snapshots/taskflow-snapshot-$Version-$timestamp.tar.gz" -ForegroundColor White
Write-Host "  4. 備份清單: $manifestPath" -ForegroundColor White
Write-Host ""
Write-Host "📝 查看備份清單以了解完整恢復流程" -ForegroundColor Yellow
Write-Host ""
