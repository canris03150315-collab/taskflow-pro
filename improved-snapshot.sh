#!/bin/bash
# 改進版快照腳本 - 避免容器運行時 commit 導致問題

SNAPSHOT_DIR="/root/taskflow-snapshots"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Usage: ./create-snapshot.sh VERSION"
    exit 1
fi

SNAPSHOT_NAME="taskflow-snapshot-${VERSION}-${TIMESTAMP}"
SNAPSHOT_PATH="${SNAPSHOT_DIR}/${SNAPSHOT_NAME}"

echo "========================================="
echo "Creating snapshot: ${SNAPSHOT_NAME}"
echo "========================================="
mkdir -p "${SNAPSHOT_PATH}"

# 步驟 1: 停止容器（避免 commit 時的不一致）
echo "1. Stopping container..."
docker stop taskflow-pro
sleep 2

# 步驟 2: Commit Docker 映像
echo "2. Committing Docker image..."
docker commit taskflow-pro taskflow-pro:latest

# 步驟 3: 重啟容器
echo "3. Restarting container..."
docker start taskflow-pro
sleep 3

# 步驟 4: 保存 Docker 映像
echo "4. Saving Docker image..."
docker save taskflow-pro:latest > "${SNAPSHOT_PATH}/docker-image.tar"

# 步驟 5: 備份資料庫
echo "5. Backing up database..."
if [ -f /root/taskflow-data-fresh/taskflow.db ]; then
    cp /root/taskflow-data-fresh/taskflow.db "${SNAPSHOT_PATH}/taskflow.db"
elif [ -f /root/taskflow-data/taskflow.db ]; then
    cp /root/taskflow-data/taskflow.db "${SNAPSHOT_PATH}/taskflow.db"
fi

# 步驟 6: 備份配置文件
echo "6. Backing up config..."
if [ -f /root/taskflow-data-fresh/.db-key ]; then
    cp /root/taskflow-data-fresh/.db-key "${SNAPSHOT_PATH}/.db-key"
elif [ -f /root/taskflow-data/.db-key ]; then
    cp /root/taskflow-data/.db-key "${SNAPSHOT_PATH}/.db-key"
fi

# 步驟 7: 創建恢復說明
echo "7. Creating restore instructions..."
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
docker run -d --name taskflow-pro \
  -p 3000:3000 -p 3001:3001 \
  -e PORT=3000 \
  -v /root/taskflow-data-restored:/app/data \
  taskflow-pro:latest
```

5. 驗證
```bash
docker logs taskflow-pro --tail 20
curl http://localhost:3000/api/health
```
EOF

# 步驟 8: 壓縮快照
echo "8. Compressing snapshot..."
cd "${SNAPSHOT_DIR}"
tar -czf "${SNAPSHOT_NAME}.tar.gz" "${SNAPSHOT_NAME}"
rm -rf "${SNAPSHOT_NAME}"

# 步驟 9: 顯示結果
echo ""
echo "========================================="
echo "✅ Snapshot created successfully!"
echo "========================================="
echo "Location: ${SNAPSHOT_DIR}/${SNAPSHOT_NAME}.tar.gz"
echo "Size: $(du -h ${SNAPSHOT_DIR}/${SNAPSHOT_NAME}.tar.gz | cut -f1)"
echo ""
echo "Container status:"
docker ps | grep taskflow-pro
echo ""
