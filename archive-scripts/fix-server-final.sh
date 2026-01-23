#!/bin/bash
cd /tmp

# Add require statement after line 33
sed -i '33 a const workLogsRoutes = require("./routes/work-logs");' server.js

# Find the reports route line and add work-logs route after it
LINE=$(grep -n "this.app.use('/api/reports'" server.js | cut -d: -f1)
sed -i "${LINE} a \        this.app.use('/api/work-logs', workLogsRoutes);" server.js

echo "Fixed server.js"

# Copy back to container
docker cp /tmp/server.js taskflow-pro:/app/dist/server.js

# Start container
docker start taskflow-pro

echo "Container started"
