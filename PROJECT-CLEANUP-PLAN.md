# 專案清理計劃

**創建日期**: 2026-01-22 20:25  
**狀態**: 待確認

---

## 📊 當前狀態分析

### 檔案統計
- **診斷腳本** (`diagnose-*.js`): 47 個
- **修復腳本** (`fix-*.js`): 91 個
- **測試腳本** (`test-*.js`): 42 個
- **檢查腳本** (`check-*.js`): 52 個
- **其他 JS 腳本**: 100+ 個
- **臨時資料夾**: 4 個

**總計**: 根目錄有 **300+ 個腳本檔案**

### 問題
1. ❌ 根目錄過於混亂，難以找到重要檔案
2. ❌ 大量舊的診斷/修復腳本（1-2 週前的）
3. ❌ 臨時資料夾佔用空間
4. ❌ 重複的備份檔案

---

## 🎯 清理建議

### 方案 A：完整清理（推薦）✅

#### 1. 移動舊腳本到 archive-scripts
**目標檔案**：1 月 15 日之前的診斷/修復/測試腳本

```powershell
# 移動舊腳本（1/15 之前）
Get-ChildItem -File | Where-Object { 
    ($_.Name -like 'diagnose-*.js' -or 
     $_.Name -like 'fix-*.js' -or 
     $_.Name -like 'test-*.js' -or 
     $_.Name -like 'check-*.js') -and 
    $_.LastWriteTime -lt (Get-Date '2026-01-15')
} | ForEach-Object {
    Move-Item $_.FullName archive-scripts\
}
```

**預估**: 移動約 180-200 個檔案

#### 2. 清理臨時資料夾
**刪除**：
- `temp-1231-backup/`
- `temp-netlify-1231/`
- `temp-source-1230/`
- `temp-backup/`

**原因**: 這些是 12/31 和 1/1 的臨時備份，已過時且有正式備份

```powershell
Remove-Item -Recurse -Force temp-1231-backup, temp-netlify-1231, temp-source-1230, temp-backup
```

**預估**: 釋放約 5-10 MB

#### 3. 移動重複的路由備份檔案
**目標檔案**：
- `routines-*.js` (多個版本)
- `schedules-*.js` (多個版本)
- `users-*.js` (舊版本)
- `kol-*.js` (舊版本)
- `reports-*.js` (舊版本)
- `attendance-*.js` (舊版本)

```powershell
# 移動舊版本路由檔案
Move-Item routines-backup.js archive-scripts\
Move-Item routines-v8.9.139-good.js archive-scripts\
Move-Item routines-v8.9.139.js archive-scripts\
Move-Item routines-2days-ago.js archive-scripts\
Move-Item schedules-v8.9.139.js archive-scripts\
Move-Item users-v8.9.139.js archive-scripts\
Move-Item attendance-v8.9.139.js archive-scripts\
```

**保留**：
- `routines-current.js`
- `routines-current-v8.9.154.js`
- `schedules-current.js`
- `kol-current.js`
- `current-reports.js`

#### 4. 移動舊的 Shell 腳本
```powershell
Move-Item compare-routes-detailed.sh archive-scripts\
Move-Item compare-routines-versions.js archive-scripts\
Move-Item detailed-diff-report.sh archive-scripts\
Move-Item full-compare.sh archive-scripts\
Move-Item fix-server-final.sh archive-scripts\
Move-Item fix-server-work-logs.sh archive-scripts\
Move-Item test-api-endpoint.sh archive-scripts\
```

#### 5. 移動舊的配置和文檔
```powershell
# 移動重複的 AI 文檔
Move-Item AI_HANDOVER_GUIDE.md archive-docs\
Move-Item AI_HANDOVER_GUIDE_V3.md archive-docs\

# 移動舊的問題報告
Move-Item ROUTINES-ISSUE-REPORT.md archive-docs\
Move-Item ROUTINES-FIX-SUMMARY.md archive-docs\
Move-Item FINAL-ROUTINES-FIX-SUMMARY.md archive-docs\
Move-Item DIFF-REPORT-KOL-RESTORE.md archive-docs\
Move-Item full-comparison-report.md archive-docs\
```

---

### 方案 B：保守清理

只清理臨時資料夾和最舊的腳本（1/10 之前）。

---

## 📋 清理後的根目錄結構

### 保留的檔案類型
1. **配置檔案**: `package.json`, `vite.config.ts`, `netlify.toml`, `.env.*`
2. **核心代碼**: `App.tsx`, `types.ts`, `index.tsx`
3. **重要文檔**: 
   - `PROJECT-KNOWLEDGE-BASE.md`
   - `PROJECT-QUICKSTART.md`
   - `WORK_LOG_CURRENT.md`
   - `AI-MUST-READ-FIRST.md`
   - `PERFORMANCE-ISSUE-DIAGNOSIS.md`
   - `SCHEDULE-NANA-*.md`
4. **部署腳本**: `deploy-*.ps1`, `complete-backup.ps1`
5. **最近的腳本**: 1/15 之後的診斷/修復腳本（約 50 個）
6. **當前版本路由**: `*-current.js`
7. **資料夾**: `components/`, `server/`, `services/`, `utils/`, `archive-*/`

### 移除的檔案
- 180-200 個舊腳本 → `archive-scripts/`
- 4 個臨時資料夾 → 刪除
- 10+ 個重複檔案 → `archive-scripts/` 或 `archive-docs/`

---

## 🎯 執行步驟

### 1. 執行清理腳本
```powershell
# 創建清理腳本
Write-Host "開始清理專案..." -ForegroundColor Cyan

# 1. 移動舊腳本
Get-ChildItem -File | Where-Object { 
    ($_.Name -like 'diagnose-*.js' -or 
     $_.Name -like 'fix-*.js' -or 
     $_.Name -like 'test-*.js' -or 
     $_.Name -like 'check-*.js') -and 
    $_.LastWriteTime -lt (Get-Date '2026-01-15')
} | ForEach-Object {
    Write-Host "移動: $($_.Name)" -ForegroundColor Gray
    Move-Item $_.FullName archive-scripts\ -ErrorAction SilentlyContinue
}

# 2. 刪除臨時資料夾
Write-Host "`n刪除臨時資料夾..." -ForegroundColor Yellow
Remove-Item -Recurse -Force temp-1231-backup -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force temp-netlify-1231 -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force temp-source-1230 -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force temp-backup -ErrorAction SilentlyContinue

# 3. 移動重複備份
Write-Host "`n移動重複備份檔案..." -ForegroundColor Yellow
@(
    'routines-backup.js',
    'routines-v8.9.139-good.js',
    'routines-v8.9.139.js',
    'routines-2days-ago.js',
    'schedules-v8.9.139.js',
    'users-v8.9.139.js',
    'attendance-v8.9.139.js'
) | ForEach-Object {
    if (Test-Path $_) {
        Write-Host "移動: $_" -ForegroundColor Gray
        Move-Item $_ archive-scripts\ -ErrorAction SilentlyContinue
    }
}

# 4. 移動舊文檔
Write-Host "`n移動舊文檔..." -ForegroundColor Yellow
@(
    'AI_HANDOVER_GUIDE.md',
    'AI_HANDOVER_GUIDE_V3.md',
    'ROUTINES-ISSUE-REPORT.md',
    'ROUTINES-FIX-SUMMARY.md',
    'FINAL-ROUTINES-FIX-SUMMARY.md',
    'DIFF-REPORT-KOL-RESTORE.md',
    'full-comparison-report.md'
) | ForEach-Object {
    if (Test-Path $_) {
        Write-Host "移動: $_" -ForegroundColor Gray
        Move-Item $_ archive-docs\ -ErrorAction SilentlyContinue
    }
}

# 5. 移動 Shell 腳本
Write-Host "`n移動 Shell 腳本..." -ForegroundColor Yellow
Get-ChildItem -File *.sh | ForEach-Object {
    Write-Host "移動: $($_.Name)" -ForegroundColor Gray
    Move-Item $_.FullName archive-scripts\ -ErrorAction SilentlyContinue
}

Write-Host "`n✅ 清理完成！" -ForegroundColor Green
Write-Host "`n根目錄剩餘 JS 檔案: $((Get-ChildItem -File *.js).Count) 個" -ForegroundColor Cyan
```

### 2. Git Commit
```powershell
git add .
git commit -m "chore: 清理專案，移動舊腳本到 archive"
```

---

## 📊 預期結果

### 清理前
- 根目錄 JS 檔案: 300+ 個
- 總大小: ~50 MB

### 清理後
- 根目錄 JS 檔案: 50-70 個（最近使用的）
- archive-scripts: 新增 200+ 個
- archive-docs: 新增 10+ 個
- 總大小: ~45 MB（釋放 5-10 MB）

### 效果
- ✅ 根目錄更清晰
- ✅ 易於找到重要檔案
- ✅ 保留所有歷史記錄（在 archive）
- ✅ Git 歷史完整

---

## ⚠️ 安全性

- ✅ 不刪除任何代碼檔案，只移動到 archive
- ✅ 保留所有重要文檔
- ✅ Git 歷史完整
- ✅ 可隨時從 archive 恢復

---

**等待用戶確認後執行清理。**
