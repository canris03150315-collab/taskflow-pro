# PowerShell 最佳實踐 - 防止語法錯誤

**最後更新**: 2026-01-09  
**目的**: 根絕 PowerShell 腳本語法錯誤

---

## 🚨 常見語法錯誤和解決方案

### 1. 不要使用 `&&` 運算符

**❌ 錯誤**:
```powershell
git add . && git commit -m "message"
ssh server "cd /path && ls"
```

**✅ 正確**:
```powershell
git add . ; git commit -m "message"
ssh server "cd /path ; ls"
```

**原因**: PowerShell 不支援 `&&` 運算符，必須使用分號 `;`

---

### 2. 避免中文字符在腳本中

**❌ 錯誤**:
```powershell
Write-Host "檢查狀態" -ForegroundColor Yellow
$message = "系統正常"
```

**✅ 正確**:
```powershell
Write-Host "Check Status" -ForegroundColor Yellow
$message = "System OK"
```

**原因**: 中文字符可能導致編碼問題，在不同環境下顯示亂碼或解析錯誤

---

### 3. 字串引號嵌套

**❌ 錯誤**:
```powershell
ssh server "echo "hello world""
```

**✅ 正確 - 方法 1（使用單引號）**:
```powershell
ssh server "echo 'hello world'"
```

**✅ 正確 - 方法 2（使用 Here-String）**:
```powershell
$script = @"
echo "hello world"
"@
ssh server $script
```

---

### 4. 變數在字串中的使用

**❌ 錯誤**:
```powershell
ssh server "df -h / | awk '{print $5}'"  # $5 會被解析為 PowerShell 變數
```

**✅ 正確**:
```powershell
ssh server "df -h / | awk '{print `$5}'"  # 使用反引號轉義
```

---

### 5. 多行命令

**❌ 錯誤**:
```powershell
$result = ssh server "
    cd /path
    ls -la
"
```

**✅ 正確**:
```powershell
$script = @"
cd /path
ls -la
"@
$result = ssh server $script
```

---

## 📋 腳本編寫檢查清單

在創建或修改 PowerShell 腳本前，檢查：

- [ ] 沒有使用 `&&` 運算符（改用 `;`）
- [ ] 沒有使用 `||` 運算符（改用 PowerShell 邏輯）
- [ ] 避免中文字符（使用英文）
- [ ] 字串引號正確嵌套
- [ ] 變數在遠端命令中正確轉義
- [ ] 多行命令使用 Here-String
- [ ] 測試腳本語法：`powershell -NoProfile -Command "& '.\script.ps1'"`

---

## 🔧 腳本模板

### 基本腳本模板
```powershell
# Script Name and Purpose
# Author: AI Assistant
# Date: YYYY-MM-DD

# Set error action preference
$ErrorActionPreference = "Stop"

# Main logic
try {
    Write-Host "Starting..." -ForegroundColor Cyan
    
    # Your code here
    
    Write-Host "Complete!" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
```

### SSH 命令模板
```powershell
# Simple SSH command
$result = ssh user@host "command"

# Multiple commands
$script = @"
cd /path
command1
command2
"@
$result = ssh user@host $script

# With variable
$version = "v1.0.0"
$result = ssh user@host "echo $version"
```

---

## 🎯 實用函數庫

### 安全的 SSH 執行
```powershell
function Invoke-SafeSSH {
    param(
        [string]$Host,
        [string]$Command
    )
    
    try {
        $result = ssh root@$Host $Command 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "SSH command failed: $result"
        }
        return $result
    } catch {
        Write-Host "SSH Error: $_" -ForegroundColor Red
        return $null
    }
}

# Usage
$status = Invoke-SafeSSH -Host "165.227.147.40" -Command "docker ps"
```

### 安全的文件上傳
```powershell
function Send-FileViaSSH {
    param(
        [string]$LocalPath,
        [string]$RemotePath,
        [string]$Host = "165.227.147.40"
    )
    
    if (-not (Test-Path $LocalPath)) {
        Write-Host "Error: File not found - $LocalPath" -ForegroundColor Red
        return $false
    }
    
    try {
        Get-Content $LocalPath -Raw | ssh root@$Host "cat > $RemotePath"
        Write-Host "File uploaded successfully" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "Upload failed: $_" -ForegroundColor Red
        return $false
    }
}

# Usage
Send-FileViaSSH -LocalPath ".\fix.js" -RemotePath "/app/fix.js"
```

---

## 🧪 測試腳本

### 語法檢查
```powershell
# Test script syntax without running
powershell -NoProfile -Command "& '.\script.ps1' -WhatIf"

# Parse script for errors
$errors = $null
$null = [System.Management.Automation.PSParser]::Tokenize((Get-Content .\script.ps1 -Raw), [ref]$errors)
if ($errors.Count -gt 0) {
    Write-Host "Syntax errors found:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "  Line $($_.Token.StartLine): $($_.Message)" }
} else {
    Write-Host "No syntax errors" -ForegroundColor Green
}
```

---

## 📚 參考資源

### PowerShell 運算符對照表

| Bash/Linux | PowerShell | 說明 |
|------------|------------|------|
| `&&` | `;` 或 `-and` | 順序執行或邏輯與 |
| `||` | `-or` | 邏輯或 |
| `$VAR` | `$VAR` | 變數（相同） |
| `\$VAR` | `` `$VAR `` | 轉義變數 |
| `'string'` | `'string'` | 單引號字串（相同） |
| `"string"` | `"string"` | 雙引號字串（相同） |

### 常用 PowerShell 命令

```powershell
# 檢查命令是否存在
Get-Command git -ErrorAction SilentlyContinue

# 測試路徑
Test-Path "C:\path\to\file"

# 獲取文件內容
Get-Content "file.txt" -Raw

# 執行外部命令並捕獲輸出
$output = & git status 2>&1

# 檢查上一個命令的退出碼
if ($LASTEXITCODE -eq 0) { Write-Host "Success" }
```

---

## 🚀 快速修復指南

### 如果腳本報錯

1. **檢查 `&&` 運算符**
   ```powershell
   # 搜尋所有使用 && 的地方
   Select-String -Path "*.ps1" -Pattern "&&"
   ```

2. **檢查中文字符**
   ```powershell
   # 搜尋包含中文的文件
   Get-ChildItem *.ps1 | Where-Object { 
       (Get-Content $_.FullName -Raw) -match '[\u4e00-\u9fa5]' 
   }
   ```

3. **測試語法**
   ```powershell
   powershell -NoProfile -File ".\script.ps1"
   ```

---

## ✅ 檢查清單

創建新腳本時：
- [ ] 使用英文註釋和訊息
- [ ] 使用 `;` 而不是 `&&`
- [ ] 正確處理字串引號
- [ ] 使用 Here-String 處理多行
- [ ] 添加錯誤處理（try-catch）
- [ ] 測試語法
- [ ] 在實際環境測試

---

**最後更新**: 2026-01-09  
**維護者**: AI Assistant  
**狀態**: ✅ 強制執行
