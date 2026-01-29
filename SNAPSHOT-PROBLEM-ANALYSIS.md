# 快照恢復缺失問題分析與解決方案

## 🔴 問題描述

**現象**：
- 修改時出錯，恢復快照後
- 總會缺失檔案、功能或資料
- 找不出問題出在哪裡

## 🔍 根本原因分析

### 當前快照機制的問題

檢查 `/root/create-snapshot.sh` 發現：

```bash
# 當前快照只備份：
1. Docker 映像 (docker-image.tar)
2. 資料庫文件 (taskflow.db)
3. 加密金鑰 (.db-key)
```

### ❌ 缺失的關鍵內容

**1. 前端代碼不在快照中**
- 前端部署在 Netlify
- 快照只包含後端 Docker 映像
- 恢復快照時，前端版本可能不匹配

**2. 容器內修改的文件不在映像中**
- 使用 `docker exec` 修改的文件
- 如果沒有 `docker commit`，修改會遺失
- 恢復快照時，這些修改不存在

**3. 數據不同步**
- 快照創建時的資料庫狀態
- 恢復時可能缺少最新資料
- 前後端版本不匹配

**4. 上傳文件不在快照中**
- `/root/taskflow-data/uploads/` 目錄
- 用戶上傳的文件不會被備份

**5. 配置文件可能缺失**
- 環境變數
- 其他配置文件

## 🎯 問題場景示例

### 場景 1：前後端版本不匹配

```
1. 修改後端 API，添加新欄位
2. 部署前端，使用新欄位
3. 創建快照（只包含後端）
4. 出錯，恢復快照
5. 結果：後端恢復了，但前端還是新版本
6. 前端調用不存在的 API → 錯誤
```

### 場景 2：容器內修改遺失

```
1. 使用 docker exec 修改後端文件
2. 測試正常，但忘記 docker commit
3. 創建快照（映像是舊的）
4. 出錯，恢復快照
5. 結果：修改的文件不見了
```

### 場景 3：資料不同步

```
1. 修改資料庫結構（添加欄位）
2. 部署新代碼
3. 創建快照（資料庫有新欄位）
4. 繼續使用，產生新資料
5. 出錯，恢復快照
6. 結果：新資料遺失
```

## ✅ 完整解決方案

### 方案 1：改善快照機制（推薦）

創建**完整的系統快照**，包含所有組件：

```bash
#!/bin/bash
# 完整快照腳本

VERSION=$1
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SNAPSHOT_DIR="/root/taskflow-snapshots"
SNAPSHOT_NAME="taskflow-complete-${VERSION}-${TIMESTAMP}"
SNAPSHOT_PATH="${SNAPSHOT_DIR}/${SNAPSHOT_NAME}"

mkdir -p "${SNAPSHOT_PATH}"

echo "=== 創建完整系統快照 ==="

# 1. 後端 Docker 映像
echo "1. 備份後端 Docker 映像..."
docker commit taskflow-pro taskflow-pro:${VERSION}
docker save taskflow-pro:${VERSION} > "${SNAPSHOT_PATH}/backend-image.tar"

# 2. 資料庫（使用 SQLite BACKUP API）
echo "2. 備份資料庫..."
docker exec taskflow-pro node -e "
const Database = require('better-sqlite3');
const source = new Database('/app/data/taskflow.db', { readonly: true });
const backup = source.backup('/tmp/snapshot-db.db');
let remaining = -1;
while (remaining !== 0) {
  backup.step(100);
  remaining = backup.remainingPages;
}
backup.close();
source.close();
"
docker cp taskflow-pro:/tmp/snapshot-db.db "${SNAPSHOT_PATH}/taskflow.db"
docker exec taskflow-pro rm -f /tmp/snapshot-db.db

# 3. 上傳文件
echo "3. 備份上傳文件..."
if [ -d /root/taskflow-data/uploads ]; then
  cp -r /root/taskflow-data/uploads "${SNAPSHOT_PATH}/uploads"
fi

# 4. 證書文件
echo "4. 備份證書..."
if [ -d /root/taskflow-data/certificates ]; then
  cp -r /root/taskflow-data/certificates "${SNAPSHOT_PATH}/certificates"
fi

# 5. 配置文件
echo "5. 備份配置..."
if [ -f /root/taskflow-data/.db-key ]; then
  cp /root/taskflow-data/.db-key "${SNAPSHOT_PATH}/.db-key"
fi

# 6. 前端版本記錄
echo "6. 記錄前端版本..."
echo "記錄當前 Netlify 部署 ID"
cat > "${SNAPSHOT_PATH}/frontend-version.txt" << EOF
前端部署時間: $(date)
Netlify Deploy ID: (需要手動記錄)
前端版本: ${VERSION}
EOF

# 7. 系統狀態
echo "7. 記錄系統狀態..."
cat > "${SNAPSHOT_PATH}/system-state.txt" << EOF
快照創建時間: $(date)
後端版本: ${VERSION}
Docker 映像: taskflow-pro:${VERSION}
容器狀態: $(docker ps | grep taskflow-pro)
資料庫大小: $(du -h /root/taskflow-data/taskflow.db)
EOF

# 8. 壓縮
echo "8. 壓縮快照..."
cd "${SNAPSHOT_DIR}"
tar -czf "${SNAPSHOT_NAME}.tar.gz" "${SNAPSHOT_NAME}"
rm -rf "${SNAPSHOT_NAME}"

echo "=== 快照創建完成 ==="
echo "位置: ${SNAPSHOT_DIR}/${SNAPSHOT_NAME}.tar.gz"
du -h "${SNAPSHOT_DIR}/${SNAPSHOT_NAME}.tar.gz"
```

### 方案 2：版本控制和部署流程改善

**建立嚴格的部署流程**：

```
1. 修改前創建快照
   └─ 記錄當前前端和後端版本

2. 修改代碼
   └─ 前端和後端同步修改

3. 測試
   └─ 在測試環境完整測試

4. 部署
   ├─ 先部署後端
   ├─ docker commit 創建新映像
   ├─ 測試後端 API
   ├─ 部署前端
   ├─ 測試前端功能
   └─ 創建快照（記錄版本）

5. 驗證
   └─ 完整功能測試
```

### 方案 3：版本配對記錄

創建版本配對表：

```markdown
| 日期 | 後端版本 | 前端 Deploy ID | 資料庫版本 | 快照名稱 |
|------|---------|---------------|-----------|---------|
| 2026-01-29 | v8.9.182 | abc123def456 | v8.9.182 | snapshot-xxx |
```

### 方案 4：Git 版本控制

**強烈建議使用 Git**：

```bash
# 前端代碼
git tag v8.9.182-frontend
git push origin v8.9.182-frontend

# 後端代碼（如果有源碼）
git tag v8.9.182-backend
git push origin v8.9.182-backend
```

## 🔧 立即可實施的改善

### 改善 1：創建版本記錄文件

每次部署後記錄：

```bash
cat > /root/deployment-log.txt << EOF
=== 部署記錄 ===
日期: $(date)
後端版本: v8.9.182
後端映像: taskflow-pro:v8.9.182
前端 Deploy ID: (從 Netlify 複製)
資料庫版本: v8.9.182
快照: taskflow-snapshot-v8.9.182-xxx.tar.gz
修改內容: [描述修改內容]
EOF
```

### 改善 2：部署檢查清單

每次部署前檢查：

```
□ 創建快照（修改前）
□ 記錄當前版本
□ 修改後端代碼
□ docker commit 創建新映像
□ 測試後端 API
□ 修改前端代碼
□ 部署前端到 Netlify
□ 記錄 Netlify Deploy ID
□ 完整功能測試
□ 創建快照（修改後）
□ 記錄版本配對
```

### 改善 3：快速恢復腳本

創建配對恢復腳本：

```bash
#!/bin/bash
# restore-version.sh

VERSION=$1

echo "恢復版本: ${VERSION}"

# 1. 恢復後端
echo "1. 恢復後端..."
docker stop taskflow-pro
docker rm taskflow-pro
docker run -d --name taskflow-pro -p 3000:3000 -p 3001:3001 \
  -v /root/taskflow-data:/app/data \
  taskflow-pro:${VERSION}

# 2. 恢復資料庫
echo "2. 恢復資料庫..."
# 從快照恢復

# 3. 提示前端版本
echo "3. 前端版本："
echo "請在 Netlify 恢復到對應的 Deploy ID"
echo "查看 /root/deployment-log.txt 找到配對的 Deploy ID"
```

## 📋 最佳實踐

### 1. 每次修改前

```bash
# 創建快照
/root/create-snapshot.sh v當前版本-before-修改描述

# 記錄當前狀態
echo "修改前狀態: $(date)" >> /root/modification-log.txt
```

### 2. 修改過程中

```bash
# 修改後端
docker exec taskflow-pro [修改命令]

# 立即 commit
docker commit taskflow-pro taskflow-pro:v新版本

# 測試
curl http://localhost:3000/api/test
```

### 3. 修改完成後

```bash
# 創建快照
/root/create-snapshot.sh v新版本-after-修改描述

# 記錄版本配對
echo "v新版本 | 前端DeployID | $(date)" >> /root/version-mapping.txt
```

### 4. 出錯恢復

```bash
# 查看版本記錄
cat /root/version-mapping.txt

# 恢復到穩定版本
docker stop taskflow-pro
docker rm taskflow-pro
docker run -d --name taskflow-pro ... taskflow-pro:v穩定版本

# 在 Netlify 恢復前端到對應版本
```

## 🎯 建議實施順序

### 立即（今天）

1. ✅ 創建版本記錄文件
2. ✅ 記錄當前前後端版本
3. ✅ 創建部署檢查清單

### 短期（本週）

1. 🔧 改善快照腳本（包含更多內容）
2. 🔧 建立版本配對表
3. 🔧 創建快速恢復腳本

### 中期（本月）

1. 📦 實施完整的版本控制
2. 📦 建立測試環境
3. 📦 自動化部署流程

## 💡 關鍵建議

1. **永遠記錄版本配對**
   - 後端版本 ↔ 前端 Deploy ID
   - 這樣恢復時才知道要恢復哪個前端版本

2. **修改後立即 commit**
   - 容器內修改後立即 `docker commit`
   - 不要等到出錯才發現沒有保存

3. **前後端同步部署**
   - 先部署後端，測試 API
   - 再部署前端，測試功能
   - 確保版本匹配

4. **保留穩定版本**
   - 至少保留最近 3 個穩定版本
   - 出錯時可以快速回退

5. **詳細記錄修改**
   - 每次修改都記錄做了什麼
   - 出錯時才知道問題可能在哪裡

## 🔴 常見錯誤

### 錯誤 1：只恢復後端
```
❌ 只恢復後端快照
✅ 同時恢復前端到對應版本
```

### 錯誤 2：忘記 commit
```
❌ docker exec 修改後直接創建快照
✅ docker exec 修改 → docker commit → 創建快照
```

### 錯誤 3：沒有記錄版本
```
❌ 不知道當前是什麼版本
✅ 詳細記錄每個版本的內容和配對
```

### 錯誤 4：快照不完整
```
❌ 只備份資料庫
✅ 備份所有相關文件（資料庫、上傳文件、配置等）
```

## 總結

**問題根源**：
- 快照不完整（缺少前端、上傳文件等）
- 沒有版本配對記錄
- 容器修改沒有 commit

**解決方案**：
- 改善快照機制（包含所有組件）
- 建立版本配對記錄
- 嚴格的部署流程
- 修改後立即 commit

**立即行動**：
1. 創建版本記錄文件
2. 記錄當前版本配對
3. 建立部署檢查清單
4. 下次修改時嚴格遵循流程
