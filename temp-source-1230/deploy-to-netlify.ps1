# TaskFlow Pro - Netlify 自動部署腳本
Write-Host "🚀 開始部署到 Netlify..." -ForegroundColor Cyan

# 確保在正確的目錄
$projectPath = "C:\Users\USER\Downloads\公司內部"
Set-Location $projectPath

# 1. 構建前端
Write-Host "`n📦 構建前端..." -ForegroundColor Yellow
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 構建失敗！" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 構建完成！" -ForegroundColor Green

# 2. 部署到 Netlify
Write-Host "`n🌐 部署到 Netlify..." -ForegroundColor Yellow

# 確保 .netlify 目錄存在並包含站點 ID
New-Item -ItemType Directory -Force -Path ".netlify" | Out-Null
'{"siteId":"480c7dd5-1159-4f1d-867a-0144272d1e0b"}' | Out-File -FilePath ".netlify\state.json" -Encoding ascii -NoNewline

# 使用 netlify deploy 命令
netlify deploy --prod --dir=dist

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ 部署成功！" -ForegroundColor Green
    Write-Host "🌐 網站地址: https://bejewelled-shortbread-a1aa30.netlify.app" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ 部署失敗！請檢查錯誤訊息。" -ForegroundColor Red
    Write-Host "💡 提示：如果遇到 build 命令錯誤，請手動拖放 dist 資料夾到 Netlify。" -ForegroundColor Yellow
}
