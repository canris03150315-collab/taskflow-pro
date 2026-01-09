$siteId = "480c7dd5-1159-4f1d-867a-0144272d1e0b"
$env:NETLIFY_SITE_ID = $siteId
New-Item -ItemType Directory -Force -Path ".netlify" | Out-Null
"{`"siteId`":`"$siteId`"}" | Out-File -FilePath ".netlify\state.json" -Encoding ascii -NoNewline
Write-Host "Deploying to Netlify..." -ForegroundColor Cyan
netlify deploy --prod --dir=dist
