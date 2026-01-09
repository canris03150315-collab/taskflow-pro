# TaskFlow Pro - Automated Frontend Deployment
Write-Host "Building and deploying frontend..." -ForegroundColor Cyan

# Step 1: Clean cache
Write-Host "Cleaning cache..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "node_modules\.vite" -ErrorAction SilentlyContinue

# Step 2: Build
Write-Host "Building..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Ensure netlify.toml exists
$tomlContent = "[[redirects]]`n  from = `"/api/*`"`n  to = `"http://165.227.147.40/api/:splat`"`n  status = 200`n  force = true`n`n[[redirects]]`n  from = `"/*`"`n  to = `"/index.html`"`n  status = 200"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("$PWD\dist\netlify.toml", $tomlContent, $utf8NoBom)

# Step 4: Deploy
Write-Host "Deploying to Netlify..." -ForegroundColor Yellow
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment successful!" -ForegroundColor Green
    Write-Host "URL: https://transcendent-basbousa-6df2d2.netlify.app" -ForegroundColor Cyan
    Write-Host "Press Ctrl+Shift+R to force refresh if needed" -ForegroundColor Yellow
} else {
    Write-Host "Deployment failed!" -ForegroundColor Red
}