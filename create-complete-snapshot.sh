#!/bin/bash

# 完整系統快照腳本 v2
# 解決：恢復快照後缺失文件/功能/資料的問題

VERSION=$1
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SNAPSHOT_DIR="/root/taskflow-snapshots"
SNAPSHOT_NAME="complete-${VERSION}-${TIMESTAMP}"
SNAPSHOT_PATH="${SNAPSHOT_DIR}/${SNAPSHOT_NAME}"

if [ -z "$VERSION" ]; then
    echo "用法: ./create-complete-snapshot.sh VERSION"
    echo "例如: ./create-complete-snapshot.sh v8.9.182"
    exit 1
fi

echo "=========================================="
echo "創建完整系統快照: ${VERSION}"
echo "時間: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

mkdir -p "${SNAPSHOT_PATH}"

# 1. 後端 Docker 映像
echo "1. 備份後端 Docker 映像..."
docker commit taskflow-pro taskflow-pro:${VERSION}
docker save taskflow-pro:${VERSION} > "${SNAPSHOT_PATH}/backend-image.tar"
echo "   ✅ 後端映像已保存"

# 2. 資料庫（完整備份）
echo "2. 備份資料庫..."
cp /root/taskflow-data/taskflow.db "${SNAPSHOT_PATH}/taskflow.db"
if [ -f /root/taskflow-data/taskflow.db-wal ]; then
    cp /root/taskflow-data/taskflow.db-wal "${SNAPSHOT_PATH}/taskflow.db-wal"
fi
if [ -f /root/taskflow-data/taskflow.db-shm ]; then
    cp /root/taskflow-data/taskflow.db-shm "${SNAPSHOT_PATH}/taskflow.db-shm"
fi
echo "   ✅ 資料庫已備份"

# 3. 上傳文件
echo "3. 備份上傳文件..."
if [ -d /root/taskflow-data/uploads ] && [ "$(ls -A /root/taskflow-data/uploads)" ]; then
    cp -r /root/taskflow-data/uploads "${SNAPSHOT_PATH}/uploads"
    echo "   ✅ 上傳文件已備份"
else
    echo "   ⚠️  無上傳文件"
fi

# 4. 證書文件
echo "4. 備份證書..."
if [ -d /root/taskflow-data/certificates ] && [ "$(ls -A /root/taskflow-data/certificates)" ]; then
    cp -r /root/taskflow-data/certificates "${SNAPSHOT_PATH}/certificates"
    echo "   ✅ 證書已備份"
else
    echo "   ⚠️  無證書文件"
fi

# 5. 配置文件
echo "5. 備份配置..."
if [ -f /root/taskflow-data/.db-key ]; then
    cp /root/taskflow-data/.db-key "${SNAPSHOT_PATH}/.db-key"
    echo "   ✅ 加密金鑰已備份"
fi

# 6. 記錄系統狀態
echo "6. 記錄系統狀態..."
cat > "${SNAPSHOT_PATH}/snapshot-info.txt" << EOF
========================================
完整系統快照資訊
========================================

快照版本: ${VERSION}
創建時間: $(date '+%Y-%m-%d %H:%M:%S')
時間戳: ${TIMESTAMP}

後端資訊:
- Docker 映像: taskflow-pro:${VERSION}
- 容器狀態: $(docker ps --filter name=taskflow-pro --format "{{.Status}}")
- 映像大小: $(docker images taskflow-pro:${VERSION} --format "{{.Size}}")

資料庫資訊:
- 資料庫大小: $(du -h /root/taskflow-data/taskflow.db | cut -f1)
- 備份時間: $(date '+%Y-%m-%d %H:%M:%S')

前端資訊:
- ⚠️ 請手動記錄 Netlify Deploy ID
- 前端版本: ${VERSION}
- 部署時間: [請填寫]
- Deploy ID: [請從 Netlify 複製]

快照內容:
✅ 後端 Docker 映像
✅ 完整資料庫（含 WAL/SHM）
✅ 上傳文件目錄
✅ 證書文件
✅ 配置文件
✅ 系統狀態記錄

恢復方法:
1. 解壓快照: tar -xzf ${SNAPSHOT_NAME}.tar.gz
2. 載入映像: docker load < ${SNAPSHOT_NAME}/backend-image.tar
3. 停止容器: docker stop taskflow-pro && docker rm taskflow-pro
4. 啟動容器: docker run -d --name taskflow-pro -p 3000:3000 -p 3001:3001 -v /root/taskflow-data:/app/data taskflow-pro:${VERSION}
5. 恢復資料庫: cp ${SNAPSHOT_NAME}/taskflow.db /root/taskflow-data/
6. 恢復上傳文件: cp -r ${SNAPSHOT_NAME}/uploads /root/taskflow-data/
7. 在 Netlify 恢復前端到對應的 Deploy ID

========================================
EOF

echo "   ✅ 系統狀態已記錄"

# 7. 更新版本記錄
echo "7. 更新版本記錄..."
cat >> /root/version-history.txt << EOF
========================================
版本: ${VERSION}
日期: $(date '+%Y-%m-%d %H:%M:%S')
快照: ${SNAPSHOT_NAME}.tar.gz
後端映像: taskflow-pro:${VERSION}
前端 Deploy ID: [請手動填寫]
修改內容: [請描述本次修改]
========================================

EOF

echo "   ✅ 版本記錄已更新"

# 8. 壓縮
echo "8. 壓縮快照..."
cd "${SNAPSHOT_DIR}"
tar -czf "${SNAPSHOT_NAME}.tar.gz" "${SNAPSHOT_NAME}"
rm -rf "${SNAPSHOT_NAME}"

SNAPSHOT_SIZE=$(du -h "${SNAPSHOT_DIR}/${SNAPSHOT_NAME}.tar.gz" | cut -f1)

echo ""
echo "=========================================="
echo "✅ 完整快照創建成功"
echo "=========================================="
echo "快照名稱: ${SNAPSHOT_NAME}.tar.gz"
echo "快照大小: ${SNAPSHOT_SIZE}"
echo "快照位置: ${SNAPSHOT_DIR}/${SNAPSHOT_NAME}.tar.gz"
echo ""
echo "⚠️  重要提醒："
echo "1. 請記錄當前 Netlify Deploy ID"
echo "2. 請在 /root/version-history.txt 中填寫前端 Deploy ID"
echo "3. 請描述本次修改內容"
echo ""
echo "查看版本記錄: cat /root/version-history.txt"
echo "=========================================="
