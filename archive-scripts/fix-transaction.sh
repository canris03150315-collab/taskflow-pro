#!/bin/bash
# Fix transaction error in tasks.js

cd /app/dist/routes
cp tasks.js tasks.js.backup

# Remove db.transaction wrapper and add await
sed -i '334s/.*/        \/\/ Update task/' tasks.js
sed -i '335s/db.run/await db.run/' tasks.js
sed -i '339s/db.run/await db.run/' tasks.js
sed -i '350d' tasks.js

echo "Fixed transaction block"
grep -n "db.transaction" tasks.js && echo "ERROR: Still has transaction" || echo "SUCCESS: No transaction found"
