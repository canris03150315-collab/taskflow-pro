const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

// Fix: Change ORDER BY from ASC to DESC to get most recent conversations
// Then reverse in code to maintain chronological order for display
content = content.replace(
  /SELECT \* FROM ai_conversations WHERE user_id = \? ORDER BY created_at ASC LIMIT \?/g,
  'SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
);

// Add reverse() to maintain chronological order after DESC query
content = content.replace(
  /const conversations = await db\.all\(\s+'SELECT \* FROM ai_conversations WHERE user_id = \? ORDER BY created_at DESC LIMIT \?',\s+\[userId, limit\]\s+\);/,
  `const conversations = await db.all(
      'SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );
    
    // Reverse to show oldest first (chronological order)
    conversations.reverse();`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed conversations order to show most recent');
