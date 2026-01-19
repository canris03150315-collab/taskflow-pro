# AI 助理專案交接文檔
**交接時間**: 2026-01-19 21:37 (UTC+8)  
**交接給**: Gemini AI  
**專案**: TaskFlow Pro 企業管理系統 - AI 智能助理功能

---

## 一、專案背景

### 系統架構
- **前端**: React + TypeScript，部署在 Netlify
  - 生產 URL: https://transcendent-basbousa-6df2d2.netlify.app
  - 最新 Deploy ID: `695cd52e50fcd4213b02f87c` (無需變更)
  
- **後端**: Node.js + Express + SQLite3，運行在 DigitalOcean Docker 容器
  - 伺服器: root@165.227.147.40
  - 容器名稱: `taskflow-pro`
  - 當前版本: `taskflow-pro:v8.9.136-ai-temp-disabled`
  - SSH 密碼: `j7WW03n4emoh`

### 關鍵規則（必須遵守）
1. **後端路由必須 Pure ASCII**：中文使用 Unicode Escape
2. **資料庫調用**：直接使用 `db.all()`, `db.run()`（不要用 dbCall）
3. **部署流程**：
   - 備份 → 修改 → 重啟容器 → 創建 Docker 映像 → 創建快照 → Git commit
4. **上傳文件**：使用 `Get-Content | ssh` 管道
5. **執行容器內腳本**：`docker cp` + `docker exec -w /app taskflow-pro node script.js`

---

## 二、當前任務：AI 智能助理功能

### 任務目標
實現 BOSS 專屬的 AI 智能助理，可以：
- 查詢公司數據（備忘錄、任務、員工、報表等）
- 提供智能分析和建議
- 保存對話歷史

### 已完成工作 ✅

#### 1. 後端路由完全修復
**文件**: `/app/dist/routes/ai-assistant.js`

修復內容：
- ✅ 錯誤的資料庫調用方式（`dbCall` → `db.all/run`）
- ✅ 中文字符轉為 Unicode Escape（符合 Pure ASCII 要求）
- ✅ SQL 查詢錯誤（`priority` → `urgency`）
- ✅ SQL 語法錯誤（字串引號使用模板字串）

#### 2. 資料庫表結構
已存在 `ai_conversations` 表：
```sql
CREATE TABLE ai_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,  -- 'user' or 'assistant'
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 3. 環境變數設置
已在容器中設置：
```bash
GEMINI_API_KEY=AIzaSyC13jOlDBMpyEL9d-xQ4dvCrnoDBtOpYiI
```

#### 4. Git 版本控制
- Commit `adf3fc4`: 修復資料庫調用和 ASCII 轉換
- Commit `c041b04`: 修復 tasks 欄位
- Commit `e105b29`: 修復 SQL 語法
- Commit `7038cc2`: AI 助理暫時停用

---

## 三、當前問題：Gemini API Key 無法使用

### 問題現象
- ✅ **AI Studio 網頁可以正常使用**（https://aistudio.google.com）
- ❌ **API Key 從程式調用時失敗**（錯誤：`API_KEY_INVALID`）
- ❌ 從本地 Windows 測試：失敗
- ❌ 從 DigitalOcean 伺服器測試：失敗
- ❌ 嘗試多個模型和格式：全部失敗

### 已嘗試的解決方案
1. ✅ 啟用 Gemini API
2. ✅ 設置計費帳戶
3. ✅ 修改 API Key 限制為「無」
4. ✅ 等待 5+ 分鐘讓 Key 生效
5. ✅ 創建新的 API Key：`AIzaSyC13jOlDBMpyEL9d-xQ4dvCrnoDBtOpYiI`
6. ✅ 測試不同的 API endpoint 和模型
7. ❌ **所有方法都失敗**

### API Key 詳情
- **API Key**: `AIzaSyC13jOlDBMpyEL9d-xQ4dvCrnoDBtOpYiI`
- **專案**: task pro (gen-lang-client-0130697287)
- **專案編號**: 573459402239
- **狀態**: AI Studio 可用，但程式調用返回 `API_KEY_INVALID`

### 用戶提供的 AI Studio cURL 範例
```bash
MODEL_ID="gemini-3-flash-preview"
GENERATE_CONTENT_API="streamGenerateContent"
curl -X POST -H "Content-Type: application/json" \
"https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:${GENERATE_CONTENT_API}?key=${GEMINI_API_KEY}" \
-d '@request.json'
```

---

## 四、暫時解決方案（已部署）

### 當前狀態
**後端**: 已部署暫時停用版本，AI 助理返回友好訊息：
```
🔧 AI 智能助理功能目前正在升級維護中，預計很快就會上線。

我們正在優化 AI 服務以提供更好的體驗，請稍後再試。感謝您的耐心等候！
```

**版本資訊**:
- Docker 映像: `taskflow-pro:v8.9.136-ai-temp-disabled`
- 快照: `taskflow-snapshot-v8.9.136-ai-temp-disabled-20260119_133416.tar.gz` (213MB)

**優點**:
- ✅ 前端不會報 500 錯誤
- ✅ 用戶體驗友好
- ✅ 保留所有代碼修復

---

## 五、下一步行動建議

### 選項 1：解決 Gemini API Key 問題（推薦）

**可能的原因**:
1. AI Studio 使用 OAuth 認證，而非 API Key
2. 專案需要額外權限或白名單
3. API Key 需要 24 小時激活時間
4. 地域限制

**建議行動**:
1. 檢查 AI Studio 是否真的使用 API Key 或 OAuth
2. 在 AI Studio 中點擊「Get code」獲取實際可用的完整程式碼範例
3. 檢查 Google Cloud Console 專案設置
4. 聯繫 Google Support（如果可用）

### 選項 2：使用其他 AI 服務

**OpenAI GPT**:
- 需要 OpenAI API Key
- API 穩定可靠
- 修改 `ai-assistant.js` 中的 API 調用邏輯

**Anthropic Claude**:
- 需要 Anthropic API Key
- 高質量回應
- 修改 API 調用邏輯

### 選項 3：繼續等待
等待 24 小時後重新測試 API Key。

---

## 六、重要文件位置

### 本地文件
- **AI 助理路由（完整修復版）**: `ai-assistant-ascii.js`
- **AI 助理路由（暫時停用版）**: `ai-assistant-temp-disabled.js`
- **測試腳本**: `test-gemini-*.js`, `diagnose-*.js`
- **API Key 問題文檔**: `URGENT-API-KEY-ISSUE.md`

### 伺服器文件
- **當前路由**: `/app/dist/routes/ai-assistant.js` (暫時停用版)
- **資料庫**: `/app/data/taskflow.db`
- **快照目錄**: `/root/taskflow-snapshots/`

### 重要腳本
```bash
# 創建快照
ssh root@165.227.147.40 "/root/create-snapshot.sh v版本號"

# 重啟容器
ssh root@165.227.147.40 "docker restart taskflow-pro"

# 創建映像
ssh root@165.227.147.40 "docker commit taskflow-pro taskflow-pro:v版本號"

# 查看日誌
ssh root@165.227.147.40 "docker logs taskflow-pro --tail 50"
```

---

## 七、測試方法

### 測試 API Key
```bash
# 上傳測試腳本
Get-Content "test-gemini-simple.js" -Raw | ssh root@165.227.147.40 "cat > /tmp/test.js"

# 執行測試
ssh root@165.227.147.40 "docker cp /tmp/test.js taskflow-pro:/app/test.js && docker exec -w /app taskflow-pro node test.js"
```

### 測試前端
1. 訪問：https://transcendent-basbousa-6df2d2.netlify.app
2. 使用 BOSS 帳號登入（canris 或 JEN168）
3. 進入「AI 智能助理」
4. 發送測試訊息
5. 應該看到「功能維護中」訊息（不報錯）

---

## 八、關鍵知識點

### PowerShell 語法
- ✅ 使用分號 `;` 分隔命令（不要用 `&&`）
- ✅ 多行字串用 Here-String `@"..."@`
- ✅ 管道上傳：`Get-Content file | ssh host "cat > dest"`

### Docker 操作
```bash
# 停止並刪除容器
docker stop taskflow-pro && docker rm taskflow-pro

# 啟動新容器（帶環境變數）
docker run -d --name taskflow-pro \
  -p 3000-3001:3000-3001 \
  -v /root/taskflow-data:/app/data \
  -e GEMINI_API_KEY=你的key \
  taskflow-pro:v版本號
```

### 資料庫查詢
```javascript
// 正確方式
const results = await db.all('SELECT * FROM table WHERE id = ?', [id]);
await db.run('INSERT INTO table (a, b) VALUES (?, ?)', [val1, val2]);

// 錯誤方式（不要用）
dbCall(db, 'prepare', ...).all(...);  // ❌
```

---

## 九、聯絡資訊

### 伺服器登入
- **主機**: 165.227.147.40
- **用戶**: root
- **密碼**: j7WW03n4emoh
- **容器**: taskflow-pro

### Git Repository
- **路徑**: c:\Users\USER\Downloads\公司內部
- **分支**: master
- **最新 Commit**: 7038cc2

### Gemini API
- **Console**: https://console.cloud.google.com/apis/credentials?project=573459402239
- **AI Studio**: https://aistudio.google.com
- **API Key**: AIzaSyC13jOlDBMpyEL9d-xQ4dvCrnoDBtOpYiI

---

## 十、緊急恢復

如果出現問題，可以恢復到暫時停用版本：
```bash
# 停止當前容器
ssh root@165.227.147.40 "docker stop taskflow-pro && docker rm taskflow-pro"

# 啟動暫時停用版本
ssh root@165.227.147.40 "docker run -d --name taskflow-pro -p 3000-3001:3000-3001 -v /root/taskflow-data:/app/data -e GEMINI_API_KEY=AIzaSyC13jOlDBMpyEL9d-xQ4dvCrnoDBtOpYiI taskflow-pro:v8.9.136-ai-temp-disabled"
```

---

## 十一、成功標準

**AI 助理功能完全正常時應該**:
1. BOSS 可以發送問題
2. AI 返回智能回應（不是「維護中」訊息）
3. 對話保存到資料庫
4. 可以查詢歷史對話
5. 前端無任何錯誤

**當前狀態**: 功能已修復但 API Key 無法使用，暫時返回維護訊息

---

**祝 Gemini 接手順利！如有問題請參考本文檔和全域規則文件。**
