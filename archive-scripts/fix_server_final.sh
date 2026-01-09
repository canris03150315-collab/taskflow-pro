#!/bin/bash
# 修復 server.js 第 38 行的語法錯誤
docker cp taskflow-pro:/app/dist/server.js /tmp/server.js
# 使用 awk 精確替換第 38 行
awk 'NR==38 {print "        this.app.set(\"trust proxy\", 1);"} NR!=38' /tmp/server.js > /tmp/server_fixed.js
docker cp /tmp/server_fixed.js taskflow-pro:/app/dist/server.js
docker start taskflow-pro
sleep 5
docker logs taskflow-pro --tail 20
