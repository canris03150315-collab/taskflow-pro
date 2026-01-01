#!/bin/bash
# 修復 users.js 中的 SQL 語法：datetime("now") -> datetime('now')
docker exec taskflow-pro sed -i "s/datetime(\"now\")/datetime('now')/g" /app/dist/routes/users.js
docker restart taskflow-pro
sleep 5
docker logs taskflow-pro --tail 20
