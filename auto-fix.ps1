# TaskFlow Pro - Auto Reset and Fix Script
Write-Host "========================================"
Write-Host "TaskFlow Pro - Auto Reset and Fix"
Write-Host "========================================"
Write-Host ""

Write-Host "Step 1: Creating fix script..."
"#!/bin/bash`ndocker exec taskflow-pro rm -f /app/data/taskflow.db`necho 'DB deleted'`ndocker exec taskflow-pro sed -i 's/req\.app as any)\.getDatabase()/req as any).db/g' /app/dist/middleware/auth.js`necho 'Auth fixed'`ndocker restart taskflow-pro`necho 'Backend restarted'" | Out-File -FilePath "fix.sh" -Encoding ASCII -NoNewline
Write-Host "Done"
Write-Host ""

Write-Host "Step 2: Upload and execute..."
Write-Host "Password: j7WW03n4emoh"
Write-Host ""

scp fix.sh root@165.227.147.40:/tmp/fix.sh
ssh root@165.227.147.40 "chmod +x /tmp/fix.sh && /tmp/fix.sh"

Write-Host ""
Write-Host "Step 3: Waiting for backend..."
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Step 4: Testing API..."
curl.exe -s https://transcendent-basbousa-6df2d2.netlify.app/api/auth/setup/check

Write-Host ""
Write-Host "========================================"
Write-Host "Done!"
Write-Host "========================================"
Write-Host ""
Write-Host "Visit: https://transcendent-basbousa-6df2d2.netlify.app"
Write-Host ""

Start-Process "https://transcendent-basbousa-6df2d2.netlify.app"
