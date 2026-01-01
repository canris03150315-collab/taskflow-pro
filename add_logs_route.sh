#!/bin/bash
# 在 server.js 中新增 logs 路由

# 1. 新增 require 語句 (在第30行後)
sed -i '30a const logs_1 = require("./routes/logs");' /app/dist/server.js

# 2. 新增路由註冊 (在第121行後)
sed -i '121a \        this.app.use("/api/logs", logs_1.logRoutes);' /app/dist/server.js

echo "Logs route added successfully"
