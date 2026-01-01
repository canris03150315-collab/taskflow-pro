# TaskFlow Pro 最終部署腳本
Write-Host "🚀 TaskFlow Pro - 最終部署" -ForegroundColor Cyan

# 確保 _redirects 文件存在
$redirectsContent = @"
/api/*  http://165.227.147.40/api/:splat  200
/*      /index.html                        200
"@

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("$PWD\dist\_redirects", $redirectsContent, $utf8NoBom)

Write-Host "✅ _redirects 文件已創建" -ForegroundColor Green

# 使用 Netlify CLI 部署
Write-Host "`n📦 正在部署到 Netlify..." -ForegroundColor Yellow

# 創建臨時 ZIP 文件
Write-Host "正在打包 dist 資料夾..." -ForegroundColor Gray
Compress-Archive -Path "dist\*" -DestinationPath "deploy.zip" -Force

# 使用 Netlify API 上傳
$siteId = "480c7dd5-1159-4f1d-867a-0144272d1e0b"

Write-Host "正在上傳到 Netlify..." -ForegroundColor Gray
netlify deploy --prod --dir=dist --site=$siteId

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ 部署成功！" -ForegroundColor Green
    Write-Host "🌐 網站: https://bejewelled-shortbread-a1aa30.netlify.app" -ForegroundColor Cyan
    Write-Host "`n請訪問網站並按 Ctrl+Shift+R 強制重新整理" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ 部署失敗" -ForegroundColor Red
    Write-Host "請手動上傳 dist 資料夾到 Netlify" -ForegroundColor Yellow
}

# 清理
Remove-Item "deploy.zip" -ErrorAction SilentlyContinue
