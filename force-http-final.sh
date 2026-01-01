#!/bin/bash
echo "=== 強制後端使用 HTTP ==="

CONTAINER="taskflow-pro"

echo "步驟 1: 停止並移除容器"
docker stop $CONTAINER
docker rm $CONTAINER

echo "步驟 2: 修改 server.js 使用 HTTP"
docker run --rm -v /root/taskflow-data:/app/data taskflow-pro:v2.0.3-avatar sh -c '
    # 備份原文件
    cp /app/dist/server.js /app/dist/server.js.bak
    
    # 替換 https 為 http
    sed -i "s/https.createServer/http.createServer/g" /app/dist/server.js
    sed -i "s/httpsModule/httpModule/g" /app/dist/server.js
    sed -i "s/require(\"https\")/require(\"http\")/g" /app/dist/server.js
    
    echo "修改完成"
'

echo "步驟 3: 啟動新的容器"
docker run -d \
  --name $CONTAINER \
  -p 3000:3000 \
  -v /root/taskflow-data:/app/data \
  -v /root/taskflow-data/dist:/app/dist \
  --restart unless-stopped \
  taskflow-pro:v2.0.3-avatar

echo ""
echo "等待容器啟動..."
sleep 5

echo ""
echo "檢查容器狀態..."
docker ps | grep $CONTAINER

echo ""
echo "測試 HTTP API..."
curl -s http://165.227.147.40:3000/api/health | head -1
