# TaskFlow Pro - Netlify Auto Deploy Script
Write-Host "Starting deployment to Netlify..." -ForegroundColor Cyan

# Ensure we are in the right directory
$projectPath = "C:\Users\USER\Downloads\公司內部"
if (Test-Path $projectPath) {
    Set-Location $projectPath
}

# 1. Build Frontend
Write-Host "Building frontend..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
}

# Run build
cmd /c "npm run build"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build complete!" -ForegroundColor Green

# 2. Deploy to Netlify
Write-Host "Deploying to Netlify..." -ForegroundColor Yellow

# Ensure .netlify directory exists and contains site ID
if (-not (Test-Path ".netlify")) {
    New-Item -ItemType Directory -Force -Path ".netlify" | Out-Null
}
'{"siteId":"480c7dd5-1159-4f1d-867a-0144272d1e0b"}' | Out-File -FilePath ".netlify\state.json" -Encoding ascii -NoNewline

# Use netlify deploy command
cmd /c "netlify deploy --prod --dir=dist"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment successful!" -ForegroundColor Green
    Write-Host "Site URL: https://transcendent-basbousa-6df2d2.netlify.app" -ForegroundColor Cyan
} else {
    Write-Host "Deployment failed! Please check error messages." -ForegroundColor Red
    Write-Host "Tip: If build command fails, try dragging dist folder to Netlify manually." -ForegroundColor Yellow
}
