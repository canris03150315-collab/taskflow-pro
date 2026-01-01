#!/bin/bash
echo "Fixing authentication middleware..."
docker exec taskflow-pro sed -i 's/req\.getDatabase/req.db/g' /app/dist/middleware/auth.js
docker exec taskflow-pro sed -i 's/req\.app as any)\.getDatabase()/req as any).db/g' /app/dist/middleware/auth.js
docker exec taskflow-pro sed -i 's/req as any)\.getDatabase()/req as any).db/g' /app/dist/middleware/auth.js
echo "Done"
echo "Restarting backend..."
docker restart taskflow-pro
echo "Backend restarted"
