#!/bin/bash
# 重置資料庫
docker exec taskflow-pro rm -f /app/data/taskflow.db
echo "✅ 資料庫已刪除"

# 修復認證中間件
docker exec taskflow-pro sed -i 's/req\.app as any)\.getDatabase()/req as any).db/g' /app/dist/middleware/auth.js
echo "✅ 認證中間件已修復"

# 重啟後端
docker restart taskflow-pro
echo "✅ 後端已重啟"
