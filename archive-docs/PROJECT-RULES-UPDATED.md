# 企業管理系統 - 項目規則（更新版）

**最後更新**: 2026-01-02 06:47 AM  
**版本**: 2.0  
**狀態**: ✅ 基於實戰經驗更新

---

## 🚨 核心規則（絕對遵守）

### 1. 絕對禁止

#### ❌ 不要編譯 TypeScript
- **原因**: 項目有編譯問題，本地編譯會失敗
- **替代**: 直接修改容器內的 JavaScript 文件
- **例外**: 無

#### ❌ 不要使用 SCP 命令
- **原因**: 會要求密碼輸入，無法自動化
- **替代**: 使用 `docker cp` 或 `docker exec -i ... sh -c 'cat > ...'`
- **例外**: 無

#### ❌ 不要使用 PowerShell 的 `&&`
- **原因**: PowerShell 不支持 `&&` 運算符
- **替代**: 使用分號 `;` 分隔命令
- **例外**: 在 SSH 命令內部可以使用（bash 環境）

#### ❌ 不要在雙引號內嵌套雙引號
- **原因**: PowerShell 引號嵌套問題
- **替代**: 使用 Here-String `@"..."@` 或單引號
- **例外**: 簡單的轉義可以使用 `\"`

#### ❌ 不要直接重啟 Docker 容器
- **原因**: **這是導致「修A壞B」的主要原因**
- **說明**: 重啟容器會從舊映像恢復，丟失所有修改
- **替代**: 修復後創建新映像，然後使用新映像重啟
- **例外**: 無

#### ❌ 不要跳過清除 dist 目錄
- **原因**: Vite 可能使用緩存，導致部署舊代碼
- **替代**: 每次構建前 `Remove-Item -Recurse -Force dist`
- **例外**: 無

#### ❌ 不要回滾到舊版本
- **原因**: 會丟失所有已完成的修復
- **替代**: 在當前版本上修復問題
- **例外**: 當前版本完全無法啟動時

---

### 2. 必須遵守

#### ✅ 必須創建新 Docker 映像
- **時機**: 每次修復後端文件後
- **命令**: `docker commit taskflow-pro taskflow-pro:vX.X.X-description`
- **原因**: 保存修復，防止重啟後丟失
- **重要性**: 🔴 極高 - 這是避免「修A壞B」的關鍵

#### ✅ 必須使用新映像重啟
- **步驟**:
  ```bash
  docker stop taskflow-pro
  docker rm taskflow-pro
  docker run -d --name taskflow-pro -p 3000:3000 \
    -e PORT=3000 -v /app/data:/app/data \
    taskflow-pro:vX.X.X-description
  ```
- **原因**: 確保容器使用包含修復的映像
- **重要性**: 🔴 極高

#### ✅ 必須完全清除 dist 目錄
- **時機**: 每次前端構建前
- **命令**: `Remove-Item -Recurse -Force dist`
- **原因**: 避免使用緩存的舊代碼
- **重要性**: 🔴 高

#### ✅ 必須使用無痕模式測試
- **時機**: 每次部署後
- **方法**: Ctrl+Shift+N（Chrome）或 Ctrl+Shift+P（Firefox）
- **原因**: 避免瀏覽器緩存干擾
- **重要性**: 🔴 高

#### ✅ 必須備份後再修改
- **時機**: 任何重大修改前
- **命令**: `ssh root@165.227.147.40 "docker exec taskflow-pro node dist/index.js backup"`
- **原因**: 防止數據丟失
- **重要性**: 🟡 中

#### ✅ 必須包含錯誤處理
- **格式**:
  ```javascript
  try {
    // 你的邏輯
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
  ```
- **原因**: 防止未處理的錯誤導致崩潰
- **重要性**: 🟡 中

#### ✅ 必須包含認證中間件
- **格式**:
  ```javascript
  const { authenticateToken } = require('../middleware/auth');
  router.post('/endpoint', authenticateToken, async (req, res) => {
    const db = req.db;
    const currentUser = req.user;
    // 你的邏輯
  });
  ```
- **原因**: 確保 API 安全
- **重要性**: 🟡 中

---

## 🐳 Docker 映像管理（重點）

### 為什麼 Docker 映像如此重要

**Docker 的工作原理**:
```
容器 = 映像（不可變） + 可變層（臨時）
重啟容器 = 丟棄可變層 + 從映像恢復
```

**問題場景**:
```
1. 修復文件: docker exec taskflow-pro sed -i 's/old/new/' file.js
   → 文件在可變層中被修改 ✅

2. 測試: curl http://localhost:3000/api/test
   → 修復生效 ✅

3. 重啟: docker restart taskflow-pro
   → 可變層被丟棄，從舊映像恢復 ❌
   → 修復消失，問題復現 ❌
```

**正確流程**:
```
1. 修復文件
2. 測試修復
3. docker commit（保存到新映像）✅
4. 使用新映像重啟 ✅
5. 驗證所有功能 ✅
```

### Docker 映像命名規範

**格式**: `taskflow-pro:vX.Y.Z-description`

**版本號規則**:
- **X (主版本)**: 重大架構變更（例如：2.x.x）
- **Y (次版本)**: 功能修復或新增（例如：2.1.x, 2.2.x）
- **Z (修訂版本)**: 小修復（例如：2.1.0, 2.1.1）

**描述規則**:
- 簡短描述主要修復內容
- 使用連字符分隔
- 例如：`v2.2.2-final-complete`, `v2.1.0-stable`

### Docker 映像保留策略

**必須保留**:
- 最新的穩定版本
- 最近 3 個版本
- 重要的里程碑版本

**可以刪除**:
- 測試失敗的版本
- 超過 1 週的舊版本（除非是里程碑）

---

## 📦 前端部署流程（標準）

### 完整步驟

```powershell
# 1. 進入項目目錄
cd "C:\Users\USER\Downloads\公司內部"

# 2. 清除舊構建（必須）
Remove-Item -Recurse -Force dist

# 3. 檢查並安裝依賴
npm install
# 如果缺少 terser
npm install -D terser

# 4. 構建
npm run build

# 5. 檢查構建結果
# 確認 dist 目錄存在且包含文件

# 6. 部署到 Netlify
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build

# 7. 記錄部署 ID
# 從輸出中複製 Deploy ID

# 8. 測試
# 使用無痕模式訪問並測試
```

### 常見錯誤處理

**錯誤 1**: `terser not found`
```powershell
npm install -D terser
npm run build
```

**錯誤 2**: 部署後功能未更新
```
原因：瀏覽器緩存
解決：使用無痕模式或完全清除緩存
```

**錯誤 3**: 構建失敗
```
原因：dist 目錄有問題
解決：Remove-Item -Recurse -Force dist 後重新構建
```

---

## 🔧 後端部署流程（標準）

### 完整步驟

```bash
# 1. 備份資料庫（必須）
ssh root@165.227.147.40 "docker exec taskflow-pro node dist/index.js backup"

# 2. 修復文件
# 例如：修復 auth.js
ssh root@165.227.147.40 "docker exec taskflow-pro sed -i 's/req.app.getDatabase()/req.db/g' /app/dist/routes/auth.js"

# 3. 測試修復（不重啟）
ssh root@165.227.147.40 "docker exec taskflow-pro cat /app/dist/routes/auth.js | grep 'req.db'"

# 4. 創建新映像（必須）
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v2.X.X-description"

# 5. 停止並刪除舊容器
ssh root@165.227.147.40 "docker stop taskflow-pro && docker rm taskflow-pro"

# 6. 使用新映像啟動容器
ssh root@165.227.147.40 "docker run -d --name taskflow-pro -p 3000:3000 -e PORT=3000 -v /app/data:/app/data taskflow-pro:v2.X.X-description"

# 7. 等待啟動
Start-Sleep -Seconds 15

# 8. 健康檢查
ssh root@165.227.147.40 "curl -s http://localhost:3000/api/health"

# 9. 檢查日誌
ssh root@165.227.147.40 "docker logs taskflow-pro --tail 20"

# 10. 測試所有功能
```

### 修復文件的方法

**方法 1: 使用 sed（簡單替換）**
```bash
docker exec taskflow-pro sed -i 's/old/new/g' /path/to/file.js
```

**方法 2: 使用 Node.js 腳本（複雜修改）**
```bash
# 1. 創建本地腳本
# 2. 上傳到容器
docker cp script.js taskflow-pro:/tmp/
# 3. 執行腳本
docker exec taskflow-pro node /tmp/script.js
```

**方法 3: 從本地恢復完整文件**
```powershell
Get-Content "local-file.js" -Raw | ssh root@165.227.147.40 "docker exec -i taskflow-pro sh -c 'cat > /app/dist/routes/file.js'"
```

---

## 🧪 測試流程（標準）

### 前端測試

**必須測試的功能**:
- [ ] 登入功能
- [ ] 重新整理保持登入
- [ ] 聊天訊息順序正確
- [ ] 通訊錄顯示所有用戶
- [ ] 打卡功能
- [ ] 所有頁面正常載入

**測試方法**:
1. 使用無痕模式
2. 清除所有緩存
3. 完全關閉並重新開啟瀏覽器
4. 硬刷新（Ctrl+Shift+R）

### 後端測試

**必須測試的 API**:
- [ ] `/api/health` - 健康檢查
- [ ] `/api/auth/login` - 登入
- [ ] `/api/auth/setup/check` - 設置檢查
- [ ] `/api/users` - 用戶列表
- [ ] `/api/chat/channels` - 聊天頻道
- [ ] `/api/attendance/status` - 打卡狀態

**測試命令**:
```bash
# 健康檢查
curl -s http://localhost:3000/api/health

# 登入測試
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin-1766955365557","password":"123456"}'

# 用戶列表（需要 token）
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/users
```

---

## 🔍 問題診斷流程

### 步驟 1: 收集資訊

**前端**:
- 打開 Console（F12）
- 查看錯誤訊息
- 檢查 Network 請求
- 截圖錯誤

**後端**:
```bash
# 查看日誌
ssh root@165.227.147.40 "docker logs taskflow-pro --tail 50"

# 檢查容器狀態
ssh root@165.227.147.40 "docker ps -a | grep taskflow"

# 測試 API
ssh root@165.227.147.40 "curl -s http://localhost:3000/api/health"
```

### 步驟 2: 定位問題

**前端問題**:
- 404 錯誤 → 檢查 API 路由
- 401 錯誤 → 檢查認證
- 500 錯誤 → 檢查後端日誌
- 功能不工作 → 檢查瀏覽器緩存

**後端問題**:
- 容器無法啟動 → 檢查日誌
- API 返回錯誤 → 檢查代碼
- 資料庫錯誤 → 檢查 SQL 語句

### 步驟 3: 修復問題

**原則**:
1. 只修復確認的問題
2. 一次修復一個問題
3. 修復後立即測試
4. 測試通過後創建新映像

---

## 📚 文件管理規範

### 必須維護的文檔

1. **PROJECT-RULES-UPDATED.md** - 本文檔
2. **DEPLOYMENT-BEST-PRACTICES.md** - 部署流程
3. **WORK_LOG_YYYYMMDD.md** - 每日工作日誌
4. **CURRENT-STATUS-SUMMARY.md** - 當前狀態

### 文檔更新時機

- 發現新問題時
- 找到新解決方案時
- 部署流程變更時
- 重大修復完成時

---

## 🚫 已刪除的過時規則

以下規則已不適用或已被更好的方案替代：

### ~~使用 TypeScript 編譯~~
- **原因**: 項目有編譯問題
- **替代**: 直接修改 JavaScript

### ~~直接重啟容器測試修復~~
- **原因**: 會丟失修改
- **替代**: 創建新映像後重啟

### ~~跳過清除 dist 以節省時間~~
- **原因**: 會導致部署舊代碼
- **替代**: 每次都清除 dist

### ~~回滾到舊版本解決問題~~
- **原因**: 會丟失所有修復
- **替代**: 在當前版本上修復

---

## 📊 版本記錄

| 版本 | 日期 | 主要變更 |
|------|------|----------|
| 1.0 | 2025-12-29 | 初始版本 |
| 2.0 | 2026-01-02 | 基於實戰經驗大幅更新，重點強化 Docker 映像管理 |

---

## 🎯 快速參考

### 前端快速部署
```powershell
cd "C:\Users\USER\Downloads\公司內部"
Remove-Item -Recurse -Force dist
npm run build
$env:NETLIFY_SITE_ID = "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"
netlify deploy --prod --dir=dist --no-build
```

### 後端快速修復
```bash
# 備份
ssh root@165.227.147.40 "docker exec taskflow-pro node dist/index.js backup"

# 修復
ssh root@165.227.147.40 "docker exec taskflow-pro sed -i 's/old/new/g' /path/to/file.js"

# 創建新映像
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v2.X.X-description"

# 使用新映像重啟
ssh root@165.227.147.40 "docker stop taskflow-pro && docker rm taskflow-pro && docker run -d --name taskflow-pro -p 3000:3000 -e PORT=3000 -v /app/data:/app/data taskflow-pro:v2.X.X-description"
```

### 健康檢查
```bash
ssh root@165.227.147.40 "curl -s http://localhost:3000/api/health"
```

---

**最後更新**: 2026-01-02 06:47 AM  
**維護者**: AI Assistant  
**狀態**: ✅ 已驗證有效
