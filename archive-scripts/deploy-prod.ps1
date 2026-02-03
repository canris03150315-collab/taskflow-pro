# 部署到生產環境
# ⚠️ 警告：這會更新正式網站，請確保已在測試環境驗證

param(
    [string]$Message = "生產部署"
)

Write-Host "========================================" -ForegroundColor Red
Write-Host "⚠️  部署到生產環境" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

# 確認
$confirm = Read-Host "確定要部署到生產環境嗎？(yes/no)"
if ($confirm -ne "yes") {
    Write-Host "已取消部署" -ForegroundColor Yellow
    exit 0
}

# 生產專案 Site ID
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"

Write-Host "📦 構建前端..." -ForegroundColor Yellow
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 構建失敗" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 部署到生產環境..." -ForegroundColor Yellow
netlify deploy --prod --dir=dist --no-build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ 生產部署完成！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "生產 URL: https://transcendent-basbousa-6df2d2.netlify.app" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "請驗證網站功能是否正常" -ForegroundColor Yellow
} else {
    Write-Host "❌ 部署失敗" -ForegroundColor Red
    exit 1
}
