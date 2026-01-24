# TaskFlow Pro - AI 對話銜接指南

⚠️ **警告：此文檔已過時，請勿參考！**

**請改為閱讀**：
- `AI-MANDATORY-CHECKLIST.md` - 強制檢查清單
- `WORK_LOG_CURRENT.md` - 最新系統狀態
- `PROJECT-QUICKSTART.md` - 快速啟動指南

**此文檔保留僅供歷史參考。**

---

## 📋 專案概述

**TaskFlow Pro** 是一個企業內部任務管理系統，包含：
- 任務管理、公告系統、聊天室、報表、財務等功能
- 前端：React + TypeScript + Tailwind CSS
- 後端：Node.js + Express + SQLite（運行在 Docker 容器中）

---

## 🌐 部署資訊

### 前端 (Netlify)
- **URL**: https://transcendent-basbousa-6df2d2.netlify.app
- **Site ID**: `transcendent-basbousa-6df2d2`

### 後端 (DigitalOcean)
- **伺服器 IP**: `165.227.147.40`
- **API**: `http://165.227.147.40:3000`
- **SSH**: `ssh root@165.227.147.40`
- **Docker 容器名**: `taskflow-pro`
- **資料庫路徑**: `/app/data/taskflow.db`（容器內）

---

## 🚀 部署指令

### 前端部署（標準流程）
```powershell
# 1. 進入專案目錄
cd C:\Users\USER\Downloads\公司內部

# 2. 清除舊的 dist 並建置
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue; npm run build

# 3. 部署到 Netlify
npx netlify-cli deploy --prod --dir=dist --no-build --site transcendent-basbousa-6df2d2
```

### 後端操作
```bash
# SSH 進入伺服器
ssh root@165.227.147.40

# 查看容器狀態
docker ps

# 重啟容器
docker restart taskflow-pro

# 進入容器執行命令
docker exec taskflow-pro <command>

# 查看容器日誌
docker logs taskflow-pro --tail 100
```

### 更新後端版本號
```bash
# 1. 更新 VERSION 文件
ssh root@165.227.147.40 "docker exec taskflow-pro sh -c 'echo X.X.X > /app/VERSION'"

# 2. 更新 server.js 中的版本（必須，否則 API 不會更新）
ssh root@165.227.147.40 "docker exec taskflow-pro sed -i 's/舊版本/新版本/g' /app/dist/server.js"

# 3. 重啟容器
ssh root@165.227.147.40 "docker restart taskflow-pro"
```

---

## 📁 重要檔案位置

### 前端
| 檔案 | 說明 |
|------|------|
| `C:\Users\USER\Downloads\公司內部\App.tsx` | 主應用程式 |
| `C:\Users\USER\Downloads\公司內部\components\ChatSystem.tsx` | 聊天室元件 |
| `C:\Users\USER\Downloads\公司內部\components\SubordinateView.tsx` | 團隊工作概況 |
| `C:\Users\USER\Downloads\公司內部\components\DashboardView.tsx` | 儀表板 |
| `C:\Users\USER\Downloads\公司內部\services\api.ts` | API 服務層 |
| `C:\Users\USER\Downloads\公司內部\types.ts` | TypeScript 類型定義 |
| `C:\Users\USER\Downloads\公司內部\index.html` | HTML 模板（含全域 CSS） |
| `C:\Users\USER\Downloads\公司內部\server\VERSION` | 本地版本號 |

### 後端（容器內）
| 路徑 | 說明 |
|------|------|
| `/app/dist/server.js` | 主伺服器程式 |
| `/app/dist/routes/chat.js` | 聊天路由 |
| `/app/data/taskflow.db` | SQLite 資料庫 |
| `/app/VERSION` | 版本號文件 |

---

## 🔧 目前版本

- **版本號**: `2.2.0`
- **最新更新** (2025-12-30):
  - ✅ **企業通訊系統完整實現**（創建聊天室、群組、發送訊息、已讀狀態、收回訊息）
  - ✅ 修復任務權限系統（員工、主管、公開任務）
  - ✅ 優化前端「可接取任務」過濾邏輯
  - ✅ 更新備份規則為時間戳命名（不覆蓋）
- **上一版本** (2.1.0):
  - 任務權限系統修復
- **更早版本** (2.0.5):
  - 團隊工作概況統計修復
  - 收回訊息功能
  - 手機版優化

---

## ⚠️ 已知問題 / 待處理

1. **TypeScript 警告**: `services/api.ts` 有 "Duplicate key chat" 警告（不影響運行）
2. **App.tsx Lint 錯誤**: 有些 `.task` 屬性存取錯誤（預先存在，不影響運行）

---

## 📝 最近修復的功能

### v2.2.0 更新內容 (2025-12-30)
1. **企業通訊系統完整實現** - 從零開始實現完整的聊天功能
   - ✅ 創建一對一聊天室（自動去重）
   - ✅ 創建群組聊天（支援多人）
   - ✅ 發送和接收訊息（分頁載入）
   - ✅ 已讀狀態標記和查看已讀人員
   - ✅ 收回訊息功能（2分鐘內）
   - ✅ 圖片和檔案訊息支援（前端）
   - ⏳ WebSocket 實時通訊（待實現，目前使用輪詢）
2. **詳細修復日誌** - 創建 `CHAT-SYSTEM-FIX-LOG.md` 記錄所有實現細節

### v2.1.0 更新內容 (2025-12-30)
1. **任務權限系統完整修復** - 解決員工、主管、公開任務的查詢和操作權限問題
   - 員工可以看到自己創建的任務
   - 主管可以看到分配給自己部門的任務
   - 員工可以接取部門任務
   - 員工可以看到公開任務
2. **前端過濾邏輯優化** - 「可接取任務」分頁精確顯示可操作的任務
3. **備份系統改進** - 使用時間戳命名，不覆蓋歷史備份
4. **詳細修復日誌** - 創建 `TASK-PERMISSION-FIX-LOG.md` 記錄所有問題和解決方案

### v2.0.5 更新內容
1. **團隊工作概況統計修復** - 添加 `normalizeStatus` 函數標準化任務狀態比對

### v2.0.4 更新內容
1. **收回訊息功能** - 聊天室中可收回自己發送的訊息
2. **手機版優化** - 防止過度滾動、觸控優化

---

## 🔑 重要技術細節

### 聊天室訊息格式
- 圖片: `[IMG]base64string`
- 檔案: `[FILE]filename|url`
- 已收回: `[RECALLED]`

### 任務統計邏輯
任務統計需考慮：
- `assignedToUserId` - 被指派者
- `acceptedByUserId` - 接取者
- `createdBy` - 創建者
- `targetDepartment` - 目標部門

### API 認證
- 使用 JWT Token
- Token 存在 localStorage

---

## 📦 備份

**備份位置**：`C:\Users\USER\Downloads\Backups\`

**最新備份**：
- `公司內部_v2.2.0_final_20251230_034353.zip` (27.53 MB)

**⚠️ 重要備份規則** (v2.2.0 更新)：
- ✅ 使用時間戳命名，不覆蓋舊備份
- ✅ 格式：`公司內部_[註記]_YYYYMMDD_HHMMSS.zip`
- 🚨 **只有在用戶明確說出「功能正常」後，AI 才可以執行備份**
- 詳細規則請參考：`BACKUP-RULES.md`

**備份腳本**：
```powershell
# 一般備份
.\backup-project.ps1

# 帶註記備份
.\backup-project.ps1 -BackupNote "版本說明"
```

---

## 🆘 常見問題排解

### 前端部署失敗
1. 確認 `dist` 資料夾存在
2. 檢查 Netlify CLI 是否登入：`npx netlify-cli status`

### 後端無回應
1. 檢查容器狀態：`docker ps`
2. 查看日誌：`docker logs taskflow-pro --tail 100`
3. 重啟容器：`docker restart taskflow-pro`

### 版本號未更新
- 版本號在 `server.js` 中是硬編碼的，必須用 `sed` 替換後重啟容器

---

## 📞 下次對話開始時

請告訴 AI：
> "請閱讀 `C:\Users\USER\Downloads\公司內部\AI-HANDOFF-GUIDE.md` 了解專案背景和部署流程，然後繼續處理 [你的需求]"

## 📚 重要文檔

- **AI-HANDOFF-GUIDE.md** - 專案交接指南（本文件）
- **BACKUP-RULES.md** - 備份規則說明（🚨 重要：只有用戶說「功能正常」才備份）
- **CHAT-SYSTEM-FIX-LOG.md** - 企業通訊系統完整實現日誌（2025-12-30）
- **TASK-PERMISSION-FIX-LOG.md** - 任務權限修復詳細日誌（2025-12-30）
- **backup-project.ps1** - 備份腳本

---

*最後更新：2025-12-30 v2.2.0*
