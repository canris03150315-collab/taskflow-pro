#!/bin/bash
cd /tmp
cp server.js server.js.original

# Remove any existing work-logs lines
sed -i "/workLogsRoutes/d" server.js
sed -i "/work-logs/d" server.js

# Find the line number of reports route require
REQUIRE_LINE=$(grep -n "const.*Routes = require('./routes/reports')" server.js | head -1 | cut -d: -f1)

if [ -z "$REQUIRE_LINE" ]; then
  echo "ERROR: Could not find reports require line"
  exit 1
fi

# Find the line number of reports route registration
ROUTE_LINE=$(grep -n "this.app.use('/api/reports'" server.js | head -1 | cut -d: -f1)

if [ -z "$ROUTE_LINE" ]; then
  echo "ERROR: Could not find reports route line"
  exit 1
fi

echo "Found require line at: $REQUIRE_LINE"
echo "Found route line at: $ROUTE_LINE"

# Add require statement after reports require
sed -i "${REQUIRE_LINE}a const workLogsRoutes = require('./routes/work-logs');" server.js

# Add route registration after reports route (add 1 to account for the line we just added)
ROUTE_LINE=$((ROUTE_LINE + 1))
sed -i "${ROUTE_LINE}a \        this.app.use('/api/work-logs', workLogsRoutes);" server.js

echo "SUCCESS: Fixed server.js"
