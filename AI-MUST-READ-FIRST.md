# ⚠️ AI 必讀 - 開始工作前檢查清單

**🚨 重要：每次開始新對話時，AI 必須先完成此檢查清單！**

---

## 📋 強制性閱讀順序

### 第一步：閱讀核心文件（必須按順序）

1. ✅ **本文件** (`AI-MUST-READ-FIRST.md`) - 了解工作流程
2. ✅ **PROJECT-QUICKSTART.md** - 快速了解專案狀態
3. ✅ **WORK_LOG_CURRENT.md** - 當前工作日誌和最新狀態
4. ✅ **全域規則** (`c:\Users\USER\.codeium\windsurf\memories\global_rules.md`) - 必須遵守的規則

### 第二步：執行系統檢查

```powershell
.\check-system-status.ps1
```

### 第三步：確認理解

在開始工作前，AI 必須確認已理解：
- [ ] 當前系統狀態（前端、後端、資料庫）
- [ ] 最新的變更和部署
- [ ] 重要的規則和限制
- [ ] 備份和部署流程

---

## 🚨 絕對禁止（違反將導致嚴重問題）

### 1. 備份相關
- ❌ **絕對不要在容器運行時執行 `docker commit`**
  - 會導致容器崩潰
  - 必須使用 `improved-snapshot.sh`（會先停止容器）

### 2. 部署相關
- ❌ **絕對不要測試部署到生產環境**
  - 會覆蓋正式版本
  - 必須先部署到測試環境驗證

### 3. 代碼修改相關
- ❌ **絕對不要跳過備份就修改代碼**
  - 修改前必須執行 `.\complete-backup.ps1`

### 4. Git 相關
- ❌ **絕對不要忘記 commit 變更**
  - 所有修改必須 `git add . && git commit -m "描述"`

### 5. Docker 相關
- ❌ **絕對不要忘記 commit Docker 映像**
  - 修改後端後必須 `docker commit taskflow-pro taskflow-pro:v版本號`

---

## ✅ 必須遵守的工作流程

### 開始任何工作前

```
1. 閱讀 AI-MUST-READ-FIRST.md（本文件）
2. 閱讀 PROJECT-QUICKSTART.md
3. 閱讀 WORK_LOG_CURRENT.md
4. 執行 .\check-system-status.ps1
5. 確認系統狀態正常
```

### 修改代碼時

```
1. 創建備份：.\complete-backup.ps1 -Version "v版本號" -Description "修改前備份"
2. 修改代碼
3. Git commit：git add . && git commit -m "描述"
4. 部署到測試環境：.\deploy-test.ps1
5. 驗證功能正常
6. 部署到生產環境：.\deploy-prod.ps1
7. 更新 WORK_LOG_CURRENT.md
8. 創建最終備份
```

### 修改後端時

```
1. 創建修復腳本（例如 fix-something.js）
2. 上傳到伺服器：Get-Content "fix-something.js" -Raw | ssh root@165.227.147.40 "cat > /app/fix-something.js"
3. 在容器內執行：ssh root@165.227.147.40 "docker exec -w /app taskflow-pro node fix-something.js"
4. 重啟容器：ssh root@165.227.147.40 "docker restart taskflow-pro"
5. Commit 新映像：ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v版本號"
6. 創建後端快照：ssh root@165.227.147.40 "/root/create-snapshot-improved.sh v版本號"
```

---

## 📝 每次工作結束前

### 必須完成的事項

- [ ] 所有變更已 Git commit
- [ ] WORK_LOG_CURRENT.md 已更新
- [ ] 創建了最終備份
- [ ] 系統狀態正常
- [ ] 文檔已更新

---

## 🎯 AI 自我檢查問題

在開始工作前，AI 必須能回答以下問題：

1. **當前前端 Deploy ID 是什麼？**
   - 答案：生產環境 `696084895a9a07801e57fc81`，測試環境 `6960843ec9bc3c7b0f2eb32d`

2. **當前後端 Docker 映像版本是什麼？**
   - 答案：`taskflow-pro:v8.9.86-manual-edit-status-fix-clean`

3. **修改代碼前必須做什麼？**
   - 答案：創建備份（`.\complete-backup.ps1`）

4. **測試部署和生產部署的區別是什麼？**
   - 答案：測試環境 Site ID `480c7dd5-1159-4f1d-867a-0144272d1e0b`，生產環境 Site ID `5bb6a0c9-3186-4d11-b9be-07bdce7bf186`

5. **為什麼不能在容器運行時執行 docker commit？**
   - 答案：會導致容器崩潰，必須使用 `improved-snapshot.sh`

6. **修改後端代碼後忘記 docker commit 會怎樣？**
   - 答案：容器重啟後修改會丟失

7. **為什麼不能使用 scp 命令上傳文件？**
   - 答案：會要求密碼，必須使用 `Get-Content | ssh` 管道

8. **資料庫備份等於完整備份嗎？**
   - 答案：不等於，完整備份需要 Docker 映像 + 資料庫 + 配置文件

9. **PowerShell 可以使用 && 運算符嗎？**
   - 答案：不可以，必須使用分號 `;` 分隔命令

10. **當前系統有多少個用戶？**
    - 答案：12 個用戶

---

## 🔴 違規後果

如果 AI 違反以上規則：

### 第一次違規
- ⚠️ 立即停止當前操作
- ⚠️ 重新閱讀所有核心文件
- ⚠️ 確認理解後再繼續

### 第二次違規
- 🔴 停止所有操作
- 🔴 要求用戶確認是否繼續
- 🔴 必須重新學習所有規則

### 第三次違規
- 🚫 建議用戶更換 AI 或尋求人工干預
- 🚫 當前 AI 可能不適合此專案

---

## 💡 AI 工作提示

### 開始對話時的標準回應

```
✅ 已閱讀核心文件：
- AI-MUST-READ-FIRST.md
- PROJECT-QUICKSTART.md
- WORK_LOG_CURRENT.md
- 全域規則

✅ 系統狀態檢查：
- 前端：正常運行
- 後端：正常運行
- Git：狀態乾淨
- 備份：最新備份 X 小時前

✅ 已確認理解：
- 當前系統狀態
- 重要規則和限制
- 備份和部署流程

準備開始工作。請告訴我您的需求。
```

### 開始修改代碼前的標準回應

```
在開始修改前，我將：
1. 創建完整備份
2. 確認 Git 狀態乾淨
3. 修改代碼
4. Git commit
5. 部署到測試環境
6. 驗證功能
7. 部署到生產環境（如需要）
8. 更新工作日誌

是否繼續？
```

---

## 📚 核心文件位置

- **本文件**: `AI-MUST-READ-FIRST.md`
- **快速啟動**: `PROJECT-QUICKSTART.md`
- **工作日誌**: `WORK_LOG_CURRENT.md`
- **項目知識庫**: `PROJECT-KNOWLEDGE-BASE.md`
- **備份指南**: `BACKUP-GUIDE.md`
- **全域規則**: `c:\Users\USER\.codeium\windsurf\memories\global_rules.md`

---

## 🎯 記住

1. **修改前必須備份**
2. **測試後再部署生產**
3. **所有變更必須 commit**
4. **容器運行時不要 commit**
5. **後端修改後必須 docker commit**
6. **使用 SSH 管道上傳文件**
7. **PowerShell 使用分號不是 &&**
8. **保持文檔更新**
9. **定期清理磁碟空間**
10. **遵循工作流程**

---

**最後更新**: 2026-01-09  
**版本**: 1.0  
**狀態**: ✅ 強制執行

---

## ⚡ 快速開始命令

```powershell
# 開始工作前執行
.\check-system-status.ps1

# 創建備份
.\complete-backup.ps1 -Version "v版本號" -Description "描述"

# 測試部署
.\deploy-test.ps1

# 生產部署
.\deploy-prod.ps1

# 檢查 Git 狀態
git status

# 查看最新日誌
Get-Content WORK_LOG_CURRENT.md
```

---

**🚨 重要提醒：AI 必須在每次開始新對話時閱讀此文件並完成檢查清單！**
