#!/bin/bash

# 備份 server.js
cp /app/dist/server.js /app/dist/server.js.bak

# 使用 sed 添加 announcements 和 system 路由導入
sed -i 's/const chat_1 = require("\.\/routes\/chat");/const chat_1 = require(".\/routes\/chat");\nconst announcements_1 = require(".\/routes\/announcements");\nconst system_1 = require(".\/routes\/system");/' /app/dist/server.js

# 添加路由使用
sed -i 's/this\.app\.use.*\/api\/chat.*, chat_1\.chatRoutes.*/this.app.use("\/api\/chat", chat_1.chatRoutes);\n        this.app.use("\/api\/announcements", announcements_1.announcementsRoutes);\n        this.app.use("\/api\/system", system_1.systemRoutes);/' /app/dist/server.js

echo "Server routes updated!"
