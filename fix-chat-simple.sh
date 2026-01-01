#!/bin/bash

echo "=== 停止容器 ==="
docker stop taskflow-pro
sleep 3

echo "=== 啟動容器 ==="
docker start taskflow-pro
sleep 15

echo "=== 檢查容器狀態 ==="
docker ps | grep taskflow

echo "=== 恢復原始文件 ==="
docker exec taskflow-pro cp /app/dist/routes/chat.js.backup /app/dist/routes/chat.js

echo "=== 添加 after 參數支持 ==="
# 在 before 參數處理後添加 after 參數處理
docker exec taskflow-pro sed -i '/const { limit = .50., before } = req.query;/c\        const { limit = '\''50'\'', before, after } = req.query;' /app/dist/routes/chat.js

# 在 before 條件後添加 after 條件
docker exec taskflow-pro sed -i '/params.push(before);/a\        }\n        if (after) {\n            query += '\'' AND m.created_at > ?'\'';\n            params.push(after);' /app/dist/routes/chat.js

# 修改返回值，添加 hasMore
docker exec taskflow-pro sed -i '/res.json({ messages: messages.reverse() });/c\        const result = after ? messages.reverse() : messages.reverse();\n        res.json({ messages: result, hasMore: messages.length === parseInt(limit) });' /app/dist/routes/chat.js

echo "=== 重啟容器 ==="
docker restart taskflow-pro

echo "=== 等待服務啟動 ==="
sleep 15

echo "=== 驗證服務 ==="
curl -s http://localhost:3000/api/health || echo "服務未就緒"

echo "=== 檢查修改 ==="
docker exec taskflow-pro grep -n "after" /app/dist/routes/chat.js | head -5

echo "=== 完成 ==="
