# 完整備份策略 - TaskFlow Pro

**創建日期**: 2026-01-02  
**版本**: 1.0  
**目的**: 確保系統可以完整回溯到任何穩定版本

---

## 🎯 備份目標

### 必須能夠恢復的內容
1. ✅ **Docker 映像**（應用程式代碼）
2. ✅ **資料庫**（用戶、部門、打卡等數據）
3. ✅ **配置文件**（.db-key 等）
4. ✅ **上傳文件**（如果有）

---

## 📦 三層備份機制

### 第一層：每日自動備份（已存在）

**位置**: `/root/taskflow-backups/`  
**頻率**: 每天 UTC 02:00（台灣時間 10:00）  
**內容**: 資料庫文件（taskflow.db）  
**保留**: 最近 30 天

**優點**:
- ✅ 自動執行，無需人工干預
- ✅ 定時備份，不會遺漏

**缺點**:
- ❌ 只有資料庫，沒有 Docker 映像
- ❌ 無法恢復應用程式代碼

---

### 第二層：容器內備份（已存在）

**位置**: `/app/data/backups/`  
**觸發**: 手動執行或 API 調用  
**命令**: `docker exec taskflow-pro node dist/index.js backup`  
**內容**: 資料庫文件

**優點**:
- ✅ 可以隨時手動備份
- ✅ 備份在容器內，方便訪問

**缺點**:
- ❌ 只有資料庫，沒有 Docker 映像
- ❌ 容器刪除時可能丟失（如果沒有掛載 volume）

---

### 第三層：完整系統快照（新增）⭐

**位置**: `/root/taskflow-snapshots/`  
**觸發**: 每次重大修改後手動執行  
**內容**: Docker 映像 + 資料庫 + 配置文件

#### 3.1 快照腳本

```bash
#!/bin/bash
# 文件: /root/create-snapshot.sh

SNAPSHOT_DIR="/root/taskflow-snapshots"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
VERSION=$1

if [ -z "$VERSION" ]; then
    echo "使用方法: ./create-snapshot.sh <版本號>"
    echo "範例: ./create-snapshot.sh v7.4.0"
    exit 1
fi

SNAPSHOT_NAME="taskflow-snapshot-${VERSION}-${TIMESTAMP}"
SNAPSHOT_PATH="${SNAPSHOT_DIR}/${SNAPSHOT_NAME}"

echo "📦 創建完整系統快照: ${SNAPSHOT_NAME}"

# 創建快照目錄
mkdir -p "${SNAPSHOT_PATH}"

# 1. 備份 Docker 映像
echo "1️⃣ 備份 Docker 映像..."
docker save taskflow-pro:latest > "${SNAPSHOT_PATH}/docker-image.tar"

# 2. 備份資料庫
echo "2️⃣ 備份資料庫..."
docker exec taskflow-pro node dist/index.js backup
LATEST_BACKUP=$(ls -t /root/taskflow-data/backups/*.db | head -1)
cp "${LATEST_BACKUP}" "${SNAPSHOT_PATH}/taskflow.db"

# 3. 備份配置文件
echo "3️⃣ 備份配置文件..."
cp /root/taskflow-data/.db-key "${SNAPSHOT_PATH}/.db-key" 2>/dev/null || echo "無 .db-key 文件"

# 4. 記錄映像信息
echo "4️⃣ 記錄映像信息..."
docker images taskflow-pro:latest --format "{{.ID}} {{.CreatedAt}} {{.Size}}" > "${SNAPSHOT_PATH}/image-info.txt"
docker ps -a | grep taskflow-pro >> "${SNAPSHOT_PATH}/container-info.txt"

# 5. 創建恢復說明
cat > "${SNAPSHOT_PATH}/RESTORE.md" << 'EOF'
# 恢復說明

## 快速恢復步驟

1. 停止並刪除當前容器
```bash
docker stop taskflow-pro
docker rm taskflow-pro
```

2. 載入 Docker 映像
```bash
docker load < docker-image.tar
```

3. 恢復資料庫
```bash
mkdir -p /root/taskflow-data-restored
cp taskflow.db /root/taskflow-data-restored/taskflow.db
cp .db-key /root/taskflow-data-restored/.db-key
```

4. 啟動容器
```bash
docker run -d --name taskflow-pro -p 3000:3000 \
  -v /root/taskflow-data-restored:/app/data \
  taskflow-pro:latest
```

5. 驗證
```bash
docker logs taskflow-pro --tail 20
curl http://localhost:3000/api/health
```
EOF

# 6. 壓縮快照
echo "5️⃣ 壓縮快照..."
cd "${SNAPSHOT_DIR}"
tar -czf "${SNAPSHOT_NAME}.tar.gz" "${SNAPSHOT_NAME}"
rm -rf "${SNAPSHOT_NAME}"

# 7. 顯示結果
echo ""
echo "✅ 快照創建完成！"
echo "📁 位置: ${SNAPSHOT_DIR}/${SNAPSHOT_NAME}.tar.gz"
echo "📊 大小: $(du -h ${SNAPSHOT_DIR}/${SNAPSHOT_NAME}.tar.gz | cut -f1)"
echo ""
echo "恢復命令:"
echo "  tar -xzf ${SNAPSHOT_NAME}.tar.gz"
echo "  cd ${SNAPSHOT_NAME}"
echo "  cat RESTORE.md"
```

#### 3.2 安裝快照腳本

```powershell
# 創建腳本
$script = @'
#!/bin/bash
# ... (上面的腳本內容)
'@

$script | ssh root@165.227.147.40 "cat > /root/create-snapshot.sh && chmod +x /root/create-snapshot.sh"

# 創建快照目錄
ssh root@165.227.147.40 "mkdir -p /root/taskflow-snapshots"
```

#### 3.3 使用方法

```bash
# 創建快照
ssh root@165.227.147.40 "/root/create-snapshot.sh v7.4.0"

# 列出所有快照
ssh root@165.227.147.40 "ls -lh /root/taskflow-snapshots/"

# 下載快照到本地（可選）
scp root@165.227.147.40:/root/taskflow-snapshots/taskflow-snapshot-*.tar.gz C:\Users\USER\Downloads\Backups\
```

---

## 🔄 備份時機

### 必須創建快照的時機

1. ✅ **修改前** - 任何重大修改之前
2. ✅ **修復後** - 成功修復問題後
3. ✅ **功能完成** - 新功能開發完成後
4. ✅ **測試通過** - 所有測試通過後
5. ✅ **每日結束** - 每天工作結束前

### 快照命名規範

```
taskflow-snapshot-<版本號>-<時間戳>.tar.gz

範例:
- taskflow-snapshot-v7.4.0-20260102_103000.tar.gz
- taskflow-snapshot-v7.5.0-memos-fixed-20260102_150000.tar.gz
```

---

## 📋 備份檢查清單

### 修改前檢查清單

- [ ] 創建完整系統快照
- [ ] 驗證快照文件完整性
- [ ] 記錄當前版本號
- [ ] 記錄當前功能狀態

### 修改後檢查清單

- [ ] 測試所有功能正常
- [ ] 創建新的系統快照
- [ ] 更新版本號
- [ ] 更新 PROJECT-KNOWLEDGE-BASE.md
- [ ] 創建或更新工作日誌

---

## 🚨 恢復流程

### 完整恢復步驟

```bash
# 1. 選擇要恢復的快照
cd /root/taskflow-snapshots
ls -lh

# 2. 解壓快照
tar -xzf taskflow-snapshot-v7.4.0-20260102_103000.tar.gz
cd taskflow-snapshot-v7.4.0-20260102_103000

# 3. 閱讀恢復說明
cat RESTORE.md

# 4. 執行恢復（按照 RESTORE.md 的步驟）
docker stop taskflow-pro
docker rm taskflow-pro
docker load < docker-image.tar
mkdir -p /root/taskflow-data-restored
cp taskflow.db /root/taskflow-data-restored/taskflow.db
cp .db-key /root/taskflow-data-restored/.db-key
docker run -d --name taskflow-pro -p 3000:3000 \
  -v /root/taskflow-data-restored:/app/data \
  taskflow-pro:latest

# 5. 驗證
docker logs taskflow-pro --tail 20
curl http://localhost:3000/api/health
```

---

## 📊 備份監控

### 檢查備份狀態

```bash
# 檢查每日自動備份
ssh root@165.227.147.40 "ls -lh /root/taskflow-backups/ | tail -10"

# 檢查容器內備份
ssh root@165.227.147.40 "docker exec taskflow-pro ls -lh /app/data/backups/ | tail -10"

# 檢查完整快照
ssh root@165.227.147.40 "ls -lh /root/taskflow-snapshots/"

# 檢查磁碟空間
ssh root@165.227.147.40 "df -h"
```

### 清理舊備份

```bash
# 清理 30 天前的每日備份
ssh root@165.227.147.40 "find /root/taskflow-backups/ -name '*.db' -mtime +30 -delete"

# 清理 60 天前的快照
ssh root@165.227.147.40 "find /root/taskflow-snapshots/ -name '*.tar.gz' -mtime +60 -delete"
```

---

## 🎯 最佳實踐

### DO（必須做）

1. ✅ **修改前必須創建快照**
2. ✅ **測試快照恢復流程**（至少每月一次）
3. ✅ **記錄每個快照的版本號和功能狀態**
4. ✅ **保留至少 3 個穩定版本的快照**
5. ✅ **定期檢查備份完整性**

### DON'T（禁止做）

1. ❌ **不要只備份資料庫**（必須包含 Docker 映像）
2. ❌ **不要跳過備份直接修改**
3. ❌ **不要刪除最近 7 天的快照**
4. ❌ **不要假設每日備份足夠**
5. ❌ **不要在沒有快照的情況下測試危險操作**

---

## 📝 版本追蹤

### 快照版本記錄表

| 版本號 | 創建時間 | 功能狀態 | 快照文件 | 備註 |
|--------|----------|----------|----------|------|
| v7.4.0 | 2026-01-02 10:30 | Supervisor權限、聊天修復、報表中心 | taskflow-snapshot-v7.4.0-*.tar.gz | 崩潰前最後穩定版 |
| v7.4.3 | 2026-01-02 11:16 | 同 v7.4.0，使用昨天資料 | taskflow-snapshot-v7.4.3-*.tar.gz | 當前運行版本 |
| v8.9.138 | 2026-01-19 23:20 | AI 助理完全修復 (Gemini 2.0) | taskflow-snapshot-v8.9.138-*.tar.gz | AI 功能恢復正常 |

---

## 🔧 故障排除

### 問題：恢復後登入失敗

**原因**: 資料庫和 Docker 映像版本不匹配

**解決**:
1. 確認使用同一個快照中的映像和資料庫
2. 檢查 .db-key 文件是否正確恢復
3. 查看容器日誌確認錯誤

### 問題：快照文件過大

**原因**: Docker 映像包含多層歷史

**解決**:
1. 使用 `docker image prune` 清理未使用的映像
2. 只保存必要的映像層
3. 定期清理舊快照

---

**最後更新**: 2026-01-02  
**維護者**: AI Assistant  
**審核者**: 待用戶確認
