#!/bin/bash
echo "=== 修復部署配置問題 ==="

CONTAINER="taskflow-pro"

echo "步驟 1: 安裝 openssl"
docker exec $CONTAINER sh -c "apk add --no-cache openssl" 2>/dev/null || echo "openssl 安裝失敗，繼續下一步"

echo "步驟 2: 修復 trust proxy 設定"
# 在 server.js 中加入 trust proxy 設定
docker exec $CONTAINER sed -i '/app.use(cors/a app.set("trust proxy", true);' /app/dist/server.js

echo "步驟 3: 重啟容器應用修改"
docker restart $CONTAINER

echo ""
echo "等待容器啟動..."
sleep 5

echo ""
echo "=== 修復完成 ==="
echo "測試 API..."
docker exec $CONTAINER node -e "require('http').get('http://localhost:3000/api/health', (res) => { console.log('Status:', res.statusCode); }).on('error', err => console.log('Error:', err.message));"
