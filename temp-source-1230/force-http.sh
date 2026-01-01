#!/bin/bash
echo "=== 強制使用 HTTP 模式 ==="

CONTAINER="taskflow-pro"

echo "步驟 1: 修改 server.js 強制使用 HTTP"
# 找到 HTTPS 啟動的部分並註解掉
docker exec $CONTAINER sed -i 's/https.createServer/http.createServer/g' /app/dist/server.js

echo "步驟 2: 重啟容器"
docker restart $CONTAINER

echo ""
echo "等待容器啟動..."
sleep 5

echo ""
echo "=== 驗證 HTTP 模式 ==="
docker logs $CONTAINER --tail 20 | grep -E "HTTP|HTTPS|localhost"
