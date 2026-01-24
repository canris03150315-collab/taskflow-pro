const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

// Fix: Use DESC to get most recent 50, then reverse to show chronologically
content = content.replace(
  /const conversations = await db\.all\(\s+'SELECT \* FROM ai_conversations WHERE user_id = \? ORDER BY created_at DESC LIMIT \?',\s+\[userId, limit\]\s+\);/,
  `const conversations = await db.all(
      'SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );
    
    // Reverse to show in chronological order (oldest first)
    conversations.reverse();`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed - DESC query + reverse for chronological display');
