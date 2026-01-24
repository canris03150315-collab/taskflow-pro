# TaskFlow Pro - AI 部署指南

⚠️ **警告：此文檔已過時，請勿參考！**

**請改為閱讀**：
- `AI-MANDATORY-CHECKLIST.md` - 強制檢查清單
- `PROJECT-QUICKSTART.md` - 最新部署流程

**此文檔保留僅供歷史參考。**

---

> 給其他 AI 助手的快速部署參考手冊

## 🏗️ 專案架構

```
TaskFlow Pro
├── 前端 (React + Vite + TypeScript)
│   ├── 部署位置: Netlify
│   ├── URL: https://transcendent-basbousa-6df2d2.netlify.app
│   └── API 代理: netlify.toml 中配置 /api/* → 後端
│
└── 後端 (Node.js + Express + SQLite)
    ├── 部署位置: DigitalOcean Droplet
    ├── IP: 165.227.147.40
    ├── Port: 3000
    └── 容器名稱: taskflow-pro
```

## 🔑 伺服器資訊

| 項目 | 值 |
|------|-----|
| SSH 主機 | `root@165.227.147.40` |
| SSH 密碼 | `j7WW03n4emoh` |
| Docker 容器 | `taskflow-pro` |
| 後端 Port | 3000 |
| 資料庫 | SQLite (容器內 `/app/data/`) |

## ⚡ 快速修復策略

### 核心原則：直接修改容器內編譯後的 JS 檔案

**為什麼不重新編譯？**
- TypeScript 編譯需要完整 node_modules
- Alpine Linux 容器缺少編譯原生模組的工具
- 重建 Docker 映像耗時且容易出錯

**正確做法：**
1. 在本地寫好修復腳本 (.sh)
2. 用 `scp` 上傳到伺服器
3. 用 `ssh` 執行腳本
4. 腳本內用 `docker exec` 修改容器內檔案

## 📁 關鍵檔案位置

### 容器內路徑
```
/app/dist/
├── server.js              # 主伺服器入口
├── routes/
│   ├── users.js           # 用戶 API (含頭像上傳)
│   ├── auth.js            # 認證 API
│   ├── chat.js            # 聊天 API
│   ├── tasks.js           # 任務 API
│   ├── departments.js     # 部門 API
│   └── ...
├── middleware/
│   └── auth.js            # 認證中間件
└── database-v2.js         # SQLite 資料庫操作
```

### 本地源碼路徑
```
C:\Users\USER\Downloads\公司內部\
├── server\src\routes\     # TypeScript 源碼
├── services\api.ts        # 前端 API 服務
├── components\            # React 組件
└── netlify.toml           # Netlify 配置
```

## 🛠️ 常見問題與修復

### 問題 1: API 返回 404 "前端應用未找到"

**原因：** 後端路由檔案是空的或未正確掛載

**診斷：**
```bash
ssh root@165.227.147.40 "docker exec taskflow-pro cat /app/dist/routes/chat.js"
```

**修復模板：** 建立完整的路由檔案（見 fix-backend.sh）

---

### 問題 2: SQLite 錯誤 "unrecognized token"

**原因：** SQL 字串中的引號逃逸錯誤，常見於 `datetime("now")`

**修復：** 改用 `CURRENT_TIMESTAMP`

```bash
ssh root@165.227.147.40 "docker exec taskflow-pro sed -i 's/datetime(\"now\")/CURRENT_TIMESTAMP/g' /app/dist/routes/users.js"
```

---

### 問題 3: 403 權限錯誤 "無權修改自己的角色"

**原因：** 權限檢查邏輯未考慮 BOSS 角色

**修復：** 使用 Node.js 腳本修改權限邏輯（見 fix-boss-permission.sh）

---

### 問題 4: 頭像上傳 500 錯誤

**診斷：**
```bash
ssh root@165.227.147.40 "docker logs taskflow-pro --tail 50"
```

**常見原因：**
- SQL 語法錯誤
- 路由未正確註冊
- 資料庫欄位不存在

## 📝 修復腳本範本

### 基本結構
```bash
#!/bin/sh
# 1. 修改容器內檔案
docker exec taskflow-pro sh -c 'sed -i "行號s/.*/新內容/" /app/dist/routes/xxx.js'

# 2. 或用 Node.js 做複雜修改
docker exec taskflow-pro sh -c 'cat > /tmp/fix.js << '"'"'EOF'"'"'
const fs = require("fs");
// ... 修改邏輯
EOF'
docker exec taskflow-pro node /tmp/fix.js

# 3. 重啟容器
docker restart taskflow-pro

# 4. 驗證
docker exec taskflow-pro grep -n "關鍵字" /app/dist/routes/xxx.js
```

### 上傳並執行
```bash
scp fix-script.sh root@165.227.147.40:/tmp/
ssh root@165.227.147.40 "chmod +x /tmp/fix-script.sh && /tmp/fix-script.sh"
```

## ⚠️ PowerShell 注意事項

Windows PowerShell 對引號和特殊字元的處理非常麻煩：

1. **避免在 SSH 命令中使用複雜引號**
2. **永遠使用腳本檔案而非單行命令**
3. **`&&` 在 PowerShell 中無效** — 改用 `;` 或寫成腳本

**錯誤示範：**
```powershell
# 這會失敗
ssh root@... "docker exec ... sed -i 's/old/new/' file && echo done"
```

**正確做法：**
```powershell
# 寫成腳本再上傳執行
scp fix.sh root@...:~/
ssh root@... "bash ~/fix.sh"
```

## 🔄 部署流程

### 前端部署 (Netlify)
1. 推送程式碼到 GitHub
2. Netlify 自動建構並部署
3. 確認 `netlify.toml` 中的 API 代理設定正確

### 後端快速修復
```bash
# 1. 建立修復腳本
# 2. 上傳
scp fix.sh root@165.227.147.40:/tmp/

# 3. 執行
ssh root@165.227.147.40 "bash /tmp/fix.sh"

# 4. 驗證
curl http://165.227.147.40:3000/api/health
```

### 後端完整重建（不建議，除非必要）
```bash
# 在伺服器上
cd /opt/taskflow-pro/server
docker build -t taskflow-pro:latest .
docker stop taskflow-pro
docker rm taskflow-pro
docker run -d --name taskflow-pro -p 3000:3000 -v /opt/taskflow-pro/data:/app/data taskflow-pro:latest
```

## 🧪 驗證端點

```bash
# 健康檢查
curl http://165.227.147.40:3000/api/health

# 版本資訊
curl http://165.227.147.40:3000/api/version

# 設置檢查（應返回 needsSetup: true/false）
curl http://165.227.147.40:3000/api/auth/setup/check

# 聊天頻道（需要認證，應返回 401 而非 404）
curl http://165.227.147.40:3000/api/chat/channels
```

## 📊 資料庫結構

主要資料表：
- `users` - 用戶（含 avatar 欄位）
- `departments` - 部門
- `tasks` - 任務
- `chat_channels` - 聊天頻道
- `chat_messages` - 聊天訊息
- `attendance_records` - 出勤記錄
- `system_logs` - 系統日誌

## 🎯 給 AI 的建議

1. **先診斷，後修復** — 用 `docker logs` 和 `grep` 找到真正的錯誤
2. **寫腳本，不要用長命令** — 避免引號地獄
3. **修改編譯後的 JS，不要重新編譯** — 省時省力
4. **每次修改後都驗證** — 用 `curl` 測試 API
5. **保持容器重啟** — 修改檔案後一定要 `docker restart`

---

*最後更新：2025-12-22*
*作者：Cascade AI*
