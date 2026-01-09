# 部署到測試環境
# 用途：測試新功能，不影響生產環境

param(
    [string]$Message = "測試部署"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "部署到測試環境" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 測試專案 Site ID
$env:NETLIFY_SITE_ID = "480c7dd5-1159-4f1d-867a-0144272d1e0b"

Write-Host "📦 構建前端..." -ForegroundColor Yellow
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 構建失敗" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 部署到測試環境..." -ForegroundColor Yellow
netlify deploy --prod --dir=dist --no-build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ 測試部署完成！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "測試 URL: https://bejewelled-shortbread-a1aa30.netlify.app" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "請測試所有功能，確認無誤後再部署到生產環境" -ForegroundColor Yellow
    Write-Host "生產部署命令: .\deploy-prod.ps1" -ForegroundColor Yellow
} else {
    Write-Host "❌ 部署失敗" -ForegroundColor Red
    exit 1
}
