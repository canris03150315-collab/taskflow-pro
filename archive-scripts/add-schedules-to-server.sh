#!/bin/sh
cd /app/dist
# Add schedules import after logs import
sed -i '/const logs_1 = require/a const schedules_1 = require("./routes/schedules");' index.js
# Add schedules route after logs route
sed -i '/app.use.*\/api\/logs/a \        this.app.use("/api/schedules", schedules_1.schedulesRoutes(this.db, this.wsServer));' index.js
echo "Schedules route added successfully"
