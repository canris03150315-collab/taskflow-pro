#!/bin/bash
echo "?????????..."
docker exec taskflow-pro sed -i 's/req\.app/req/g' /app/dist/middleware/auth.js
docker exec taskflow-pro sed -i 's/req)\.getDatabase()/req).db/g' /app/dist/middleware/auth.js
echo " ???"
echo "????..."
docker restart taskflow-pro
echo " ??"