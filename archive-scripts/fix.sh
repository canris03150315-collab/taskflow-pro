#!/bin/bash
docker exec taskflow-pro rm -f /app/data/taskflow.db
echo 'DB deleted'
docker exec taskflow-pro sed -i 's/req\.app as any)\.getDatabase()/req as any).db/g' /app/dist/middleware/auth.js
echo 'Auth fixed'
docker restart taskflow-pro
echo 'Backend restarted'