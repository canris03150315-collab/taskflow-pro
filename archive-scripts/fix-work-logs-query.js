const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

// Fix work_logs query - remove 'content' column that doesn't exist
content = content.replace(
  /const recentWorkLogs = await db\.all\('SELECT id, user_id, content, date FROM work_logs ORDER BY date DESC LIMIT 10'\);/g,
  "const recentWorkLogs = await db.all('SELECT id, user_id, date FROM work_logs ORDER BY date DESC LIMIT 10');"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed work_logs query');
