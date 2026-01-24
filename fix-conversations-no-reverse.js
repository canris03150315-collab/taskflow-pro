const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

// Remove the reverse() that was just added
// We want DESC order but NO reverse, so newest conversations come first
content = content.replace(
  /const conversations = await db\.all\(\s+'SELECT \* FROM ai_conversations WHERE user_id = \? ORDER BY created_at DESC LIMIT \?',\s+\[userId, limit\]\s+\);\s+\/\/ Reverse to show oldest first \(chronological order\)\s+conversations\.reverse\(\);/g,
  `const conversations = await db.all(
      'SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Removed reverse() - using DESC order directly');
