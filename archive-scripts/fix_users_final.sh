#!/bin/bash
# 修復 users.js SQL 語法：改用雙引號包裹 SQL，內部使用單引號
docker cp taskflow-pro:/app/dist/routes/users.js /tmp/users.js
# 第 350 行改用雙引號包裹 SQL 字串
sed -i '350s|.*|            "UPDATE users SET avatar = ?, updated_at = datetime(\x27now\x27) WHERE id = ?",|' /tmp/users.js
docker cp /tmp/users.js taskflow-pro:/app/dist/routes/users.js
docker start taskflow-pro
sleep 5
docker logs taskflow-pro --tail 20
