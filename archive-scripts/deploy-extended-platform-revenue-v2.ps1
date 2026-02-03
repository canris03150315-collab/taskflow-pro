# Deploy Extended Platform Revenue System
# Add support for all Excel fields

Write-Host "=== Deploy Extended Platform Revenue System ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create snapshot
Write-Host "[1/7] Creating pre-deployment snapshot..." -ForegroundColor Yellow
ssh root@165.227.147.40 "/root/create-snapshot.sh v8.9.140-before-platform-revenue-extended"
if ($LASTEXITCODE -ne 0) {
    Write-Host "X Snapshot creation failed" -ForegroundColor Red
    exit 1
}
Write-Host "OK Snapshot created" -ForegroundColor Green
Write-Host ""

# Step 2: Add database columns
Write-Host "[2/7] Adding database columns..." -ForegroundColor Yellow
Get-Content "add-platform-revenue-columns.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/add-columns.js"
ssh root@165.227.147.40 "docker cp /tmp/add-columns.js taskflow-pro:/app/add-columns.js"
$output = ssh root@165.227.147.40 "docker exec -w /app taskflow-pro node add-columns.js"
Write-Host $output
if ($output -match "ERROR" -or $output -notmatch "Summary") {
    Write-Host "X Database column addition failed" -ForegroundColor Red
    exit 1
}
Write-Host "OK Database columns added" -ForegroundColor Green
Write-Host ""

# Step 3: Test database structure
Write-Host "[3/7] Testing database structure..." -ForegroundColor Yellow
Get-Content "test-extended-platform-revenue.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/test-db.js"
ssh root@165.227.147.40 "docker cp /tmp/test-db.js taskflow-pro:/app/test-db.js"
$testOutput = ssh root@165.227.147.40 "docker exec -w /app taskflow-pro node test-db.js"
Write-Host $testOutput
if ($testOutput -notmatch "All Tests Passed") {
    Write-Host "X Database structure test failed" -ForegroundColor Red
    exit 1
}
Write-Host "OK Database structure test passed" -ForegroundColor Green
Write-Host ""

# Step 4: Update backend route
Write-Host "[4/7] Updating backend route..." -ForegroundColor Yellow
Get-Content "platform-revenue-extended-fixed.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/platform-revenue.js"
ssh root@165.227.147.40 "docker cp /tmp/platform-revenue.js taskflow-pro:/app/dist/routes/platform-revenue.js"
Write-Host "OK Route file uploaded" -ForegroundColor Green
Write-Host ""

# Step 5: Restart container
Write-Host "[5/7] Restarting container..." -ForegroundColor Yellow
ssh root@165.227.147.40 "docker restart taskflow-pro"
Write-Host "Waiting for container to start..." -ForegroundColor Gray
Start-Sleep -Seconds 8

# Check container status
$containerStatus = ssh root@165.227.147.40 "docker ps --filter name=taskflow-pro --format '{{.Status}}'"
if ($containerStatus -notmatch "Up") {
    Write-Host "X Container startup failed" -ForegroundColor Red
    Write-Host "Container status: $containerStatus" -ForegroundColor Red
    exit 1
}
Write-Host "OK Container restarted and running" -ForegroundColor Green
Write-Host ""

# Step 6: Create new image
Write-Host "[6/7] Creating new Docker image..." -ForegroundColor Yellow
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v8.9.140-platform-revenue-extended"
if ($LASTEXITCODE -ne 0) {
    Write-Host "X Image creation failed" -ForegroundColor Red
    exit 1
}
Write-Host "OK New image created: taskflow-pro:v8.9.140-platform-revenue-extended" -ForegroundColor Green
Write-Host ""

# Step 7: Create final snapshot
Write-Host "[7/7] Creating final snapshot..." -ForegroundColor Yellow
ssh root@165.227.147.40 "/root/create-snapshot.sh v8.9.140-platform-revenue-extended-complete"
if ($LASTEXITCODE -ne 0) {
    Write-Host "X Final snapshot creation failed" -ForegroundColor Red
    exit 1
}
Write-Host "OK Final snapshot created" -ForegroundColor Green
Write-Host ""

Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Backend updated with new fields:" -ForegroundColor Cyan
Write-Host "  - rebate_amount (Rebate)"
Write-Host "  - real_person_count (Real Person Count)"
Write-Host "  - chess_amount (Chess)"
Write-Host "  - lottery_private_return (Lottery Private Return)"
Write-Host "  - claim_dividend (Claim Dividend)"
Write-Host "  - delisted_dividend_1 (Delisted Dividend 1)"
Write-Host "  - delisted_dividend_2 (Delisted Dividend 2)"
Write-Host ""
Write-Host "Deployment Info:" -ForegroundColor Cyan
Write-Host "  - Backend image: taskflow-pro:v8.9.140-platform-revenue-extended"
Write-Host "  - Snapshot (before): taskflow-snapshot-v8.9.140-before-platform-revenue-extended-*.tar.gz"
Write-Host "  - Snapshot (after): taskflow-snapshot-v8.9.140-platform-revenue-extended-complete-*.tar.gz"
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Test uploading your Excel file"
Write-Host "  2. Verify all 16 fields are parsed correctly"
Write-Host "  3. Check statistics include new fields"
Write-Host ""
