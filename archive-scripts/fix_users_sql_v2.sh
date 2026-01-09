#!/bin/bash
# 修復 users.js 中的 SQL 語法：使用轉義單引號
docker cp taskflow-pro:/app/dist/routes/users.js /tmp/users.js
# 使用 awk 精確替換第 350 行，使用轉義單引號
awk 'NR==350 {print "            '\''UPDATE users SET avatar = ?, updated_at = datetime('\''\'''\''now'\''\''\'\'') WHERE id = ?'\'',"} NR!=350' /tmp/users.js > /tmp/users_fixed.js
docker cp /tmp/users_fixed.js taskflow-pro:/app/dist/routes/users.js
docker start taskflow-pro
sleep 5
docker logs taskflow-pro --tail 20
