const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

// Fix: Add rowid to ORDER BY to ensure stable sort when timestamps are identical
content = content.replace(
  /'SELECT \* FROM ai_conversations WHERE user_id = \? ORDER BY created_at DESC LIMIT \?'/g,
  "'SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?'"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Added rowid to ORDER BY for stable sort');
