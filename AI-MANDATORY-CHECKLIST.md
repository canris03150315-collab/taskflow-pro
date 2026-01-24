# 🚨 AI 強制檢查清單（每次對話必讀）

**創建日期**: 2026-01-24  
**狀態**: ✅ 強制執行  
**重要性**: ⭐⭐⭐⭐⭐

---

## ⚠️ 重要提醒

**每次開始新對話或執行任務前，AI 必須：**

1. ✅ 閱讀本文件
2. ✅ 閱讀 `WORK_LOG_CURRENT.md` 前 50 行（獲取最新狀態）
3. ✅ 閱讀 `PROJECT-QUICKSTART.md`（了解部署流程）
4. ✅ 確認全域規則（`.codeium\windsurf\memories\global_rules.md`）

**如果 AI 跳過此檢查清單，將導致：**
- ❌ 使用過時的版本資訊
- ❌ 違反專案規則
- ❌ 部署錯誤
- ❌ 資料損壞

---

## 📋 第一步：確認當前系統狀態

### 從 WORK_LOG_CURRENT.md 獲取（必須每次確認）

**前端**：
- 生產 Deploy ID: `697210e41580c21f5b1e3092`
- 生產 URL: https://transcendent-basbousa-6df2d2.netlify.app
- Netlify Site ID: `5bb6a0c9-3186-4d11-b9be-07bdce7bf186`

**後端**：
- Docker 映像: `taskflow-pro:v8.9.169-audit-db-syntax-fix`
- 容器 ID: `584738027bbf`
- 伺服器: root@165.227.147.40

**最後更新**: 檢查 `WORK_LOG_CURRENT.md` 第 3 行

---

## 📋 第二步：核心規則確認

### 絕對禁止 ❌

- [ ] ❌ **不使用 PowerShell `&&`**（用 `;` 分隔命令）
- [ ] ❌ **不編譯 TypeScript**（直接修改 JS）
- [ ] ❌ **不使用 scp 命令**（用 `Get-Content | ssh` 管道）
- [ ] ❌ **不在容器運行時 docker commit**（會崩潰）
- [ ] ❌ **不跳過備份就修改代碼**
- [ ] ❌ **不測試部署到生產環境**（先測試環境）

### 必須遵守 ✅

- [ ] ✅ **修改前必須創建快照**（`ssh root@165.227.147.40 "/root/create-snapshot.sh v版本號"`）
- [ ] ✅ **後端修改後必須 docker commit**（創建新映像）
- [ ] ✅ **前端部署必須清除 dist**（`Remove-Item -Recurse -Force dist`）
- [ ] ✅ **所有變更必須 Git commit**
- [ ] ✅ **更新 WORK_LOG_CURRENT.md**
- [ ] ✅ **使用正確的 Netlify Site ID**（生產：`5bb6a0c9-3186-4d11-b9be-07bdce7bf186`）

---

## 📋 第三步：部署流程確認

### 前端部署（必須按順序）

```powershell
# 1. 清除舊構建
Remove-Item -Recurse -Force dist

# 2. 構建
npm run build

# 3. 部署到生產環境
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build

# 4. Git commit
git add .
git commit -m "描述"
```

### 後端修改（必須按順序）

```powershell
# 1. 創建快照
ssh root@165.227.147.40 "/root/create-snapshot.sh v當前版本-before-修改描述"

# 2. 上傳修復腳本
Get-Content "fix-something.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/fix.js"

# 3. 執行修復
ssh root@165.227.147.40 "docker cp /tmp/fix.js taskflow-pro:/app/fix.js"
ssh root@165.227.147.40 "docker exec -w /app taskflow-pro node fix.js"

# 4. 重啟容器
ssh root@165.227.147.40 "docker restart taskflow-pro"

# 5. Commit 新映像
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v新版本號"

# 6. 創建最終快照
ssh root@165.227.147.40 "/root/create-snapshot.sh v新版本號-complete"

# 7. Git commit
git add .
git commit -m "描述"
```

---

## 📋 第四步：自我檢查問題

**AI 必須能回答以下問題（從 WORK_LOG_CURRENT.md 獲取）：**

1. **當前前端 Deploy ID 是什麼？**
   - 答案：檢查 `WORK_LOG_CURRENT.md` 第 12 行

2. **當前後端 Docker 映像版本是什麼？**
   - 答案：檢查 `WORK_LOG_CURRENT.md` 第 20 行

3. **生產環境 Netlify Site ID 是什麼？**
   - 答案：`5bb6a0c9-3186-4d11-b9be-07bdce7bf186`

4. **修改代碼前必須做什麼？**
   - 答案：創建快照

5. **PowerShell 可以使用 && 嗎？**
   - 答案：不可以，必須用 `;`

6. **後端修改後忘記 docker commit 會怎樣？**
   - 答案：容器重啟後修改會丟失

7. **前端部署前必須做什麼？**
   - 答案：清除 dist 資料夾

8. **最後一次更新是什麼時候？**
   - 答案：檢查 `WORK_LOG_CURRENT.md` 第 3 行

---

## 🔴 違規處理

### 如果 AI 違反規則：

**第一次違規**：
- ⚠️ 立即停止操作
- ⚠️ 重新閱讀本檢查清單
- ⚠️ 重新閱讀 `WORK_LOG_CURRENT.md`

**第二次違規**：
- 🔴 停止所有操作
- 🔴 要求用戶確認是否繼續
- 🔴 記錄違規原因

**第三次違規**：
- 🚫 建議用戶更換 AI
- 🚫 當前 AI 不適合此專案

---

## 💡 AI 標準開場白

**每次開始對話時，AI 應該回應：**

```
✅ 已完成強制檢查：
- 閱讀 AI-MANDATORY-CHECKLIST.md
- 閱讀 WORK_LOG_CURRENT.md（最後更新：YYYY-MM-DD HH:MM）
- 確認當前版本：
  - 前端 Deploy ID: XXXXXX
  - 後端映像: taskflow-pro:vX.X.X
- 確認核心規則

準備開始工作。請告訴我您的需求。
```

---

## 📚 核心文件優先級

**必讀（每次對話）**：
1. ⭐⭐⭐ `AI-MANDATORY-CHECKLIST.md`（本文件）
2. ⭐⭐⭐ `WORK_LOG_CURRENT.md`（前 50 行）
3. ⭐⭐ `PROJECT-QUICKSTART.md`

**參考（需要時）**：
4. ⭐ `PROJECT-KNOWLEDGE-BASE.md`
5. ⭐ `POWERSHELL-BEST-PRACTICES.md`
6. ⭐ 全域規則（`.codeium\windsurf\memories\global_rules.md`）

**過時文檔（不要參考）**：
- ❌ `AI-HANDOFF-GUIDE.md`（版本過時）
- ❌ `AI-DEPLOYMENT-GUIDE.md`（方法過時）
- ❌ `HANDOFF-TO-GEMINI-20260119.md`（特定時間點，已過時）

---

## 🎯 關鍵提醒

1. **永遠從 WORK_LOG_CURRENT.md 獲取最新狀態**
2. **不要相信其他文檔中的版本號**
3. **修改前必須創建快照**
4. **後端修改後必須 docker commit**
5. **前端部署前必須清除 dist**
6. **使用正確的 Netlify Site ID**
7. **PowerShell 使用 `;` 不是 `&&`**
8. **所有變更必須 Git commit**
9. **更新 WORK_LOG_CURRENT.md**
10. **遵循部署流程，不要跳步驟**

---

## ⚡ 緊急命令

```bash
# 查看當前狀態
ssh root@165.227.147.40 "docker ps"

# 查看日誌
ssh root@165.227.147.40 "docker logs taskflow-pro --tail 50"

# 重啟容器
ssh root@165.227.147.40 "docker restart taskflow-pro"

# 創建快照
ssh root@165.227.147.40 "/root/create-snapshot.sh v版本號"
```

---

## 🔄 長對話提醒機制

### 問題：對話太長時 AI 會忘記規則

**解決方案**：定期重置 AI 記憶

### 觸發條件（任一符合即重置）

1. **對話輪數**：超過 20 輪對話
2. **時間長度**：對話超過 30 分鐘
3. **複雜任務**：執行 3 個以上不同任務
4. **發現違規**：AI 開始違反核心規則

### 重置指令（用戶使用）

當發現 AI 開始「忘記」規則時，立即使用：

```
🔄 重置：請重新閱讀 AI-MANDATORY-CHECKLIST.md 和 WORK_LOG_CURRENT.md 前 50 行，確認當前系統狀態。
```

### AI 自我提醒（每 10 輪對話）

AI 應該主動提醒：

```
⚠️ 提醒：我們已經對話了 X 輪，讓我快速確認核心規則：
- 當前前端 Deploy ID: XXXXXX
- 當前後端版本: vX.X.X
- 修改前必須創建快照
- PowerShell 使用 ; 不是 &&
- 前端部署前必須清除 dist

是否需要我重新閱讀檢查清單？
```

---

## 📝 快速重置檢查點

**用戶可以隨時使用以下指令**：

### 1. 完整重置
```
🔄 完整重置：重新閱讀所有核心文檔並確認系統狀態。
```

### 2. 快速確認
```
✅ 快速確認：當前前端 Deploy ID 和後端版本是什麼？
```

### 3. 規則檢查
```
⚠️ 規則檢查：列出 5 個絕對禁止的操作。
```

### 4. 部署流程確認
```
📋 部署確認：前端部署的 5 個步驟是什麼？
```

---

## 🚨 警告信號（用戶注意）

**如果 AI 出現以下行為，立即重置**：

- ❌ 使用過時的版本號
- ❌ 提到使用 `&&` 在 PowerShell
- ❌ 建議跳過備份
- ❌ 使用錯誤的 Netlify Site ID
- ❌ 建議直接部署到生產環境（不經測試）
- ❌ 說「我記得」但給出錯誤資訊

---

**🚨 重要：AI 必須在每次開始工作前完成此檢查清單！**

**如果 AI 說「我已經知道了」或「我記得」，請要求 AI 重新閱讀此文件。**

**對話超過 20 輪或 30 分鐘，請使用重置指令。**

---

**最後更新**: 2026-01-24  
**版本**: 1.1（新增長對話提醒機制）  
**狀態**: ✅ 強制執行
