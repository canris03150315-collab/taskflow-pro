#!/bin/bash
docker exec taskflow-pro sed -i "s/req\.app as any)\.getDatabase()/req as any).db/g" /app/dist/middleware/auth.js
echo " ????????"
docker restart taskflow-pro
echo " ?????"
