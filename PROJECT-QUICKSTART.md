# TaskFlow Pro - AI 快速啟動指南

**最後更新**: 2026-01-09  
**版本**: 1.0  
**目的**: 讓 AI 快速了解專案當前狀態

---

## 🚀 開始前必讀

### 第一步：讀取這些文件
1. **本文件** (`PROJECT-QUICKSTART.md`) - 快速了解專案狀態
2. `WORK_LOG_CURRENT.md` - 當前工作日誌和最新狀態
3. `PROJECT-KNOWLEDGE-BASE.md` - 項目知識庫
4. `BACKUP-GUIDE.md` - 備份系統指南

### 第二步：檢查系統狀態
```powershell
# 執行系統狀態檢查
.\check-system-status.ps1
```

---

## 📊 當前系統狀態（2026-01-09）

### 前端
- **生產環境**: https://transcendent-basbousa-6df2d2.netlify.app
  - Deploy ID: `696084895a9a07801e57fc81`
  - Site ID: `5bb6a0c9-3186-4d11-b9be-07bdce7bf186`
- **測試環境**: https://bejewelled-shortbread-a1aa30.netlify.app
  - Deploy ID: `6960843ec9bc3c7b0f2eb32d`
  - Site ID: `480c7dd5-1159-4f1d-867a-0144272d1e0b`
- **WebSocket URL**: `wss://robust-managing-stay-largely.trycloudflare.com/ws`
- **狀態**: ✅ 正常運行

### 後端
- **伺服器**: 165.227.147.40
- **SSH 密碼**: j7WW03n4emoh
- **Docker 映像**: `taskflow-pro:v8.9.86-manual-edit-status-fix-clean`
- **容器名稱**: `taskflow-pro`
- **端口**: 3000 (HTTPS), 3001 (HTTP)
- **資料庫**: 12 個用戶，假表資料已清空
- **狀態**: ✅ 正常運行

### 本地代碼
- **Git 狀態**: 已初始化，有完整歷史
- **來源**: 從 Netlify source map 恢復（2026-01-09）
- **最新 Commit**: 大規模清理專案文件
- **狀態**: ✅ 與生產環境同步

---

## 🎯 專案架構

### 技術棧
- **前端**: React + TypeScript + Vite
- **後端**: Node.js + Express + SQLite
- **部署**: Netlify (前端) + DigitalOcean (後端)
- **WebSocket**: Cloudflare Tunnel
- **版本控制**: Git

### 目錄結構
```
公司內部/
├── src/
│   ├── components/          # React 組件
│   ├── utils/               # 工具函數
│   └── services/            # API 服務
├── App.tsx                  # 主應用程式
├── types.ts                 # TypeScript 類型定義
├── index.tsx                # 入口文件
├── package.json             # 依賴管理
├── vite.config.ts           # Vite 配置
├── netlify.toml             # Netlify 配置
├── complete-backup.ps1      # 完整備份腳本
├── backup-database.ps1      # 資料庫備份腳本
├── deploy-test.ps1          # 測試環境部署
├── deploy-prod.ps1          # 生產環境部署
├── improved-snapshot.sh     # 後端快照腳本（伺服器端）
├── WORK_LOG_CURRENT.md      # 當前工作日誌
├── PROJECT-KNOWLEDGE-BASE.md # 項目知識庫
├── BACKUP-GUIDE.md          # 備份指南
└── archive-*/               # 歸檔文件（606 個）
```

---

## 🔧 常用命令速查

### 檢查系統狀態
```bash
# 檢查後端容器
ssh root@165.227.147.40 "docker ps | grep taskflow-pro"

# 查看後端日誌
ssh root@165.227.147.40 "docker logs taskflow-pro --tail 50"

# 檢查磁碟空間
ssh root@165.227.147.40 "df -h /"

# 檢查快照數量
ssh root@165.227.147.40 "ls /root/taskflow-snapshots/*.tar.gz | wc -l"
```

### 備份操作
```powershell
# 完整備份（Git + 本地 + 資料庫 + 後端）
.\complete-backup.ps1 -Version "v版本號" -Description "描述"

# 僅資料庫備份
.\backup-database.ps1 -BackupName "backup-name"

# 後端快照
ssh root@165.227.147.40 "/root/create-snapshot-improved.sh v版本號"
```

### 部署操作
```powershell
# 測試環境部署
.\deploy-test.ps1

# 生產環境部署
.\deploy-prod.ps1
```

### Git 操作
```powershell
# 查看狀態
git status

# 提交變更
git add .
git commit -m "描述"

# 查看歷史
git log --oneline -10

# 查看標籤
git tag -l
```

---

## 📝 重要規則和限制

### 絕對禁止
1. ❌ **不要在容器運行時執行 `docker commit`** - 會導致崩潰
   - 使用 `improved-snapshot.sh` 替代（會先停止容器）
2. ❌ **不要測試部署到生產環境** - 會覆蓋正式版本
   - 先部署到測試環境驗證
3. ❌ **不要跳過備份** - 修改前必須備份
4. ❌ **不要刪除最近 7 天的備份**

### 必須遵守
1. ✅ **修改前必須備份** - 使用 `complete-backup.ps1`
2. ✅ **所有變更必須 Git commit**
3. ✅ **先測試後生產** - 使用測試環境驗證
4. ✅ **保持文檔更新** - 修改後更新 `WORK_LOG_CURRENT.md`

---

## 🎓 重要經驗教訓

### 1. 代碼恢復事件（2026-01-09）
- **問題**: 本地代碼丟失，無法獲取原始源代碼
- **解決**: 從 Netlify source map 成功提取完整源代碼
- **教訓**: Git 版本控制至關重要

### 2. 備份導致容器崩潰（2026-01-09）
- **問題**: 在容器運行時執行 `docker commit` 導致崩潰
- **解決**: 創建 `improved-snapshot.sh`（先停止容器）
- **教訓**: 備份操作需要考慮系統狀態

### 3. 磁碟空間不足（2026-01-09）
- **問題**: 170 個快照佔用 40GB，磁碟使用率 96%
- **解決**: 清理舊快照，保留最新 10 個
- **教訓**: 需要定期清理和監控磁碟空間

### 4. 前端版本混亂（2026-01-09）
- **問題**: 測試部署覆蓋生產版本
- **解決**: 建立獨立測試環境
- **教訓**: 測試和生產環境必須分離

---

## 🔍 故障排除

### 後端容器停止
```bash
# 重啟容器
ssh root@165.227.147.40 "docker start taskflow-pro"

# 查看日誌找出原因
ssh root@165.227.147.40 "docker logs taskflow-pro --tail 50"
```

### 前端無法訪問
```bash
# 檢查 Netlify 狀態
netlify status

# 檢查當前 Deploy ID
netlify api getSite --data='{"site_id": "5bb6a0c9-3186-4d11-b9be-07bdce7bf186"}' | ConvertFrom-Json | Select-Object deploy_id
```

### WebSocket 連接失敗
```bash
# 檢查 Cloudflare Tunnel 是否運行
ssh root@165.227.147.40 "ps aux | grep cloudflared"

# 查看 Tunnel 日誌
ssh root@165.227.147.40 "cat /root/cloudflared.log | tail -20"
```

### 磁碟空間不足
```bash
# 清理舊快照（保留最新 10 個）
ssh root@165.227.147.40 "cd /root/taskflow-snapshots && ls -t *.tar.gz | tail -n +11 | xargs rm -f"

# 清理 Docker 未使用的映像
ssh root@165.227.147.40 "docker image prune -a -f"
```

---

## 📞 緊急聯絡信息

### 伺服器訪問
- **IP**: 165.227.147.40
- **用戶**: root
- **密碼**: j7WW03n4emoh
- **SSH**: `ssh root@165.227.147.40`

### Netlify
- **生產 Site ID**: 5bb6a0c9-3186-4d11-b9be-07bdce7bf186
- **測試 Site ID**: 480c7dd5-1159-4f1d-867a-0144272d1e0b

### 重要文件位置
- **伺服器快照**: `/root/taskflow-snapshots/`
- **伺服器資料庫**: `/root/taskflow-data/taskflow.db`
- **本地備份**: `C:\Users\USER\Downloads\TaskFlow-DB-Backups`
- **本地代碼**: `c:\Users\USER\Downloads\公司內部`

---

## 🎯 工作流程

### 開始新任務
1. 讀取 `WORK_LOG_CURRENT.md` 了解最新狀態
2. 檢查系統狀態（容器、前端、資料庫）
3. 創建備份（如果要修改代碼）
4. 開始工作

### 修改代碼
1. 創建備份：`.\complete-backup.ps1 -Version "v版本號" -Description "修改前備份"`
2. 修改代碼
3. Git commit：`git add . && git commit -m "描述"`
4. 部署到測試環境：`.\deploy-test.ps1`
5. 驗證功能
6. 部署到生產環境：`.\deploy-prod.ps1`
7. 更新 `WORK_LOG_CURRENT.md`

### 結束工作
1. 確保所有變更已 commit
2. 更新 `WORK_LOG_CURRENT.md`
3. 創建最終備份
4. 記錄當前狀態

---

## 📊 系統功能清單

### 核心功能（全部正常）
- ✅ 用戶登入/登出
- ✅ 儀表板
- ✅ 任務管理
- ✅ 假表管理
- ✅ 企業通訊（聊天）
- ✅ 部門數據中心
- ✅ 出勤打卡
- ✅ 企業公告欄
- ✅ 部門文件與規範（SOP）
- ✅ 績效考核（KPI）
- ✅ 工作報表中心
- ✅ 零用金與公費
- ✅ 提案討論區
- ✅ 個人備忘錄
- ✅ 人員帳號管理
- ✅ 系統設定
- ✅ WebSocket 即時更新

---

## 🔐 安全注意事項

1. **SSH 密碼**: j7WW03n4emoh（測試完成後需修改）
2. **不要在代碼中硬編碼密碼**
3. **定期清理測試數據**
4. **備份文件包含敏感信息，妥善保管**

---

## ✅ 快速檢查清單

開始工作前檢查：
- [ ] 後端容器運行中
- [ ] 前端可以訪問
- [ ] WebSocket 連接正常
- [ ] 磁碟空間充足（< 80%）
- [ ] 最新備份存在（< 24 小時）
- [ ] Git 狀態乾淨（無未提交變更）

---

**最後更新**: 2026-01-09 12:45  
**維護者**: AI Assistant  
**狀態**: ✅ 系統穩定運行

---

## 💡 AI 使用提示

當您（AI）開始工作時：
1. **先讀這個文件** - 快速了解專案狀態
2. **檢查 WORK_LOG_CURRENT.md** - 了解最新變更
3. **執行系統狀態檢查** - 確認系統正常
4. **遵循工作流程** - 備份 → 修改 → 測試 → 部署
5. **更新文檔** - 完成後更新工作日誌

**記住**：
- 修改前必須備份
- 測試後再部署生產
- 所有變更必須 commit
- 保持文檔更新
