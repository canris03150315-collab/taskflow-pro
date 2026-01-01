#!/bin/bash
echo "=== 修復 HTTPS 問題 ==="

CONTAINER="taskflow-pro"

echo "步驟 1: 停止容器"
docker stop $CONTAINER
docker rm $CONTAINER

echo "步驟 2: 使用 HTTP 模式啟動"
docker run -d \
  --name $CONTAINER \
  -p 3000:3000 \
  -v /root/taskflow-data:/app/data \
  -e FORCE_HTTP=true \
  -e NODE_ENV=production \
  --restart unless-stopped \
  taskflow-pro:v2.0.3-avatar \
  sh -c "sed -i 's/https.createServer/http.createServer/g' /app/dist/server.js && node dist/index.js start"

echo ""
echo "等待容器啟動..."
sleep 8

echo ""
echo "檢查容器狀態..."
docker ps | grep $CONTAINER

echo ""
echo "檢查日誌..."
docker logs $CONTAINER --tail 20
