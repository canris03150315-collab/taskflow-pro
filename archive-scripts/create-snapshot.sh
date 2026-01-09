#!/bin/bash
# 文件: /root/create-snapshot.sh
# 用途: 創建完整系統快照（Docker 映像 + 資料庫 + 配置文件）

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
docker exec taskflow-pro node dist/index.js backup 2>/dev/null || echo "備份命令失敗，嘗試直接複製..."
LATEST_BACKUP=$(ls -t /root/taskflow-data-fresh/taskflow.db 2>/dev/null || ls -t /root/taskflow-data/taskflow.db 2>/dev/null | head -1)
if [ -f "$LATEST_BACKUP" ]; then
    cp "${LATEST_BACKUP}" "${SNAPSHOT_PATH}/taskflow.db"
else
    echo "警告: 找不到資料庫文件"
fi

# 3. 備份配置文件
echo "3️⃣ 備份配置文件..."
if [ -f /root/taskflow-data-fresh/.db-key ]; then
    cp /root/taskflow-data-fresh/.db-key "${SNAPSHOT_PATH}/.db-key"
elif [ -f /root/taskflow-data/.db-key ]; then
    cp /root/taskflow-data/.db-key "${SNAPSHOT_PATH}/.db-key"
else
    echo "警告: 找不到 .db-key 文件"
fi

# 4. 記錄映像信息
echo "4️⃣ 記錄映像信息..."
docker images taskflow-pro:latest --format "{{.ID}} {{.CreatedAt}} {{.Size}}" > "${SNAPSHOT_PATH}/image-info.txt"
docker ps -a | grep taskflow-pro >> "${SNAPSHOT_PATH}/container-info.txt"

# 5. 創建恢復說明
cat > "${SNAPSHOT_PATH}/RESTORE.md" << 'EOFMARKER'
# 恢復說明

## 快速恢復步驟

1. 停止並刪除當前容器
docker stop taskflow-pro
docker rm taskflow-pro

2. 載入 Docker 映像
docker load < docker-image.tar

3. 恢復資料庫
mkdir -p /root/taskflow-data-restored
cp taskflow.db /root/taskflow-data-restored/taskflow.db
cp .db-key /root/taskflow-data-restored/.db-key

4. 啟動容器
docker run -d --name taskflow-pro -p 3000:3000 -v /root/taskflow-data-restored:/app/data taskflow-pro:latest

5. 驗證
docker logs taskflow-pro --tail 20
curl http://localhost:3000/api/health

## 注意事項

- 確保有足夠的磁碟空間
- 恢復前先備份當前狀態
- 驗證所有功能正常後再刪除舊容器
EOFMARKER

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
echo "  cd ${SNAPSHOT_DIR}"
echo "  tar -xzf ${SNAPSHOT_NAME}.tar.gz"
echo "  cd ${SNAPSHOT_NAME}"
echo "  cat RESTORE.md"
