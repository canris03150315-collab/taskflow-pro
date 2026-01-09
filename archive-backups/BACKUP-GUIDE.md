# TaskFlow Pro 備份使用指南

**創建日期**: 2026-01-09  
**版本**: 2.0（含 Git 備份）  
**狀態**: ✅ 已測試並驗證

---

## 🎯 備份策略概覽

### 三層備份保護

1. **Git 版本控制** ⭐ 新增
   - 本地代碼歷史追蹤
   - 可隨時回滾到任何 commit
   - 使用 tag 標記重要版本

2. **本地代碼備份**
   - 完整源代碼 zip 壓縮包
   - 存儲在本地，快速恢復
   - 不依賴網絡

3. **後端系統快照**
   - Docker 映像 + 資料庫 + 配置
   - 存儲在伺服器
   - 完整系統狀態

---

## 📋 快速備份（推薦使用）

### 使用完整備份腳本

```powershell
# 在項目目錄執行
cd "c:\Users\USER\Downloads\公司內部"

# 執行備份
.\complete-backup.ps1 -Version "v版本號" -Description "描述"

# 範例
.\complete-backup.ps1 -Version "v8.9.86-stable" -Description "穩定版本備份"
```

**腳本會自動完成**：
1. ✅ Git commit 和 tag
2. ✅ 本地代碼 zip 備份
3. ✅ 後端 Docker + 資料庫快照
4. ✅ 創建備份清單

---

## 🔧 手動備份（如果腳本失敗）

### 1. Git 備份

```powershell
cd "c:\Users\USER\Downloads\公司內部"

# 提交變更
git add .
git commit -m "備份: 描述"

# 創建標籤
git tag -a "backup-v版本號-日期" -m "備份標籤"

# 查看所有標籤
git tag -l
```

### 2. 本地代碼備份

```powershell
# 創建備份目錄
$backupDir = "C:\Users\USER\Downloads\TaskFlow-Backups"
New-Item -ItemType Directory -Path $backupDir -Force

# 壓縮源代碼（排除 node_modules 和 dist）
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipPath = "$backupDir\frontend-backup-$timestamp.zip"

# 手動複製並壓縮，或使用 7-Zip
Compress-Archive -Path "c:\Users\USER\Downloads\公司內部\*" -DestinationPath $zipPath -Force
```

### 3. 後端快照

```bash
# SSH 到伺服器
ssh root@165.227.147.40

# 執行快照腳本
/root/create-snapshot.sh v版本號

# 查看快照
ls -lh /root/taskflow-snapshots/
```

---

## 🔄 恢復流程

### 從 Git 恢復本地代碼

```powershell
cd "c:\Users\USER\Downloads\公司內部"

# 查看所有備份標籤
git tag -l

# 恢復到特定標籤
git checkout backup-v8.9.86-20260109

# 或恢復到特定 commit
git checkout <commit-hash>

# 回到最新版本
git checkout master
```

### 從 zip 恢復本地代碼

```powershell
# 解壓備份
Expand-Archive -Path "C:\Users\USER\Downloads\TaskFlow-Backups\frontend-backup-*.zip" -DestinationPath "c:\Users\USER\Downloads\公司內部-restored"

# 安裝依賴
cd "c:\Users\USER\Downloads\公司內部-restored"
npm install
```

### 從快照恢復後端

```bash
# 1. SSH 到伺服器
ssh root@165.227.147.40

# 2. 進入快照目錄
cd /root/taskflow-snapshots

# 3. 列出所有快照
ls -lh

# 4. 解壓快照
tar -xzf taskflow-snapshot-v版本號-時間戳.tar.gz
cd taskflow-snapshot-v版本號-時間戳

# 5. 停止當前容器
docker stop taskflow-pro
docker rm taskflow-pro

# 6. 載入 Docker 映像
docker load < docker-image.tar

# 7. 恢復資料庫
mkdir -p /root/taskflow-data-restored
cp taskflow.db /root/taskflow-data-restored/
cp .db-key /root/taskflow-data-restored/

# 8. 啟動容器
docker run -d --name taskflow-pro \
  -p 3000:3000 -p 3001:3001 \
  -e PORT=3000 \
  -v /root/taskflow-data-restored:/app/data \
  taskflow-pro:latest

# 9. 驗證
docker logs taskflow-pro --tail 20
curl http://localhost:3000/api/health
```

---

## 📊 備份檢查

### 檢查 Git 狀態

```powershell
cd "c:\Users\USER\Downloads\公司內部"

# 查看 Git 狀態
git status

# 查看提交歷史
git log --oneline -10

# 查看所有標籤
git tag -l

# 查看特定標籤信息
git show backup-v8.9.86-20260109
```

### 檢查本地備份

```powershell
# 列出所有本地備份
Get-ChildItem "C:\Users\USER\Downloads\TaskFlow-Backups" | Sort-Object LastWriteTime -Descending | Select-Object Name, Length, LastWriteTime
```

### 檢查後端快照

```bash
# 列出所有快照
ssh root@165.227.147.40 "ls -lh /root/taskflow-snapshots/"

# 檢查最新快照
ssh root@165.227.147.40 "ls -lt /root/taskflow-snapshots/*.tar.gz | head -5"
```

---

## ⚠️ 重要提醒

### 備份時機

**必須備份的時機**：
1. ✅ 修改代碼前
2. ✅ 部署新功能前
3. ✅ 修復重大問題後
4. ✅ 每天工作結束前
5. ✅ 測試危險操作前

### 備份驗證

**每次備份後檢查**：
- [ ] Git tag 已創建
- [ ] 本地 zip 文件存在且大小合理
- [ ] 後端快照已創建
- [ ] 備份清單已生成

### 保留策略

- **Git 標籤**: 永久保留
- **本地備份**: 保留最近 30 天
- **後端快照**: 保留最近 60 天

---

## 🎯 最佳實踐

### DO（必須做）

1. ✅ **修改前必須備份**
2. ✅ **使用有意義的版本號和描述**
3. ✅ **定期測試恢復流程**
4. ✅ **保留多個穩定版本**
5. ✅ **記錄每次備份的目的**

### DON'T（禁止做）

1. ❌ **不要跳過 Git commit**
2. ❌ **不要刪除最近 7 天的備份**
3. ❌ **不要在沒有備份的情況下測試危險操作**
4. ❌ **不要假設自動備份足夠**
5. ❌ **不要忘記驗證備份完整性**

---

## 📝 備份記錄範例

### 版本記錄表

| 版本號 | 時間 | Git Tag | 本地備份 | 後端快照 | 描述 |
|--------|------|---------|----------|----------|------|
| v8.9.86-stable-restored | 2026-01-09 12:09 | ✅ | ✅ | ✅ | 從 source map 恢復的穩定版本 |
| v8.9.86-manual-edit-status-fix-clean | 2026-01-09 03:40 | ✅ | ✅ | ✅ | 清理假表測試資料後 |

---

## 🆘 故障排除

### 問題：complete-backup.ps1 執行失敗

**解決方案**：
1. 檢查 PowerShell 執行策略
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. 手動執行各個步驟（參考上面的手動備份）

### 問題：Git 提交失敗

**解決方案**：
```powershell
# 配置 Git 用戶信息
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 問題：後端快照創建失敗

**解決方案**：
```bash
# 檢查磁碟空間
ssh root@165.227.147.40 "df -h"

# 清理舊快照
ssh root@165.227.147.40 "find /root/taskflow-snapshots/ -name '*.tar.gz' -mtime +60 -delete"
```

---

## 🎉 成功案例

### 2026-01-09：從 source map 恢復源代碼

**問題**：本地代碼面目全非，無法獲取原始源代碼

**解決**：
1. 從 Netlify source map 提取源代碼
2. 初始化 Git 版本控制
3. 創建完整備份
4. 成功恢復並部署

**教訓**：
- ✅ Git 版本控制至關重要
- ✅ 多層備份提供多重保護
- ✅ Source map 是最後的救命稻草

---

**最後更新**: 2026-01-09  
**維護者**: AI Assistant  
**狀態**: ✅ 已測試並驗證
