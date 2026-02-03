const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Checking current state...');

// Check if reverse() already exists
if (content.includes('conversations.reverse()')) {
  console.log('SKIP: reverse() already exists');
  process.exit(0);
}

// Find the exact location to add reverse()
const searchPattern = /const conversations = await db\.all\(\s*'SELECT \* FROM ai_conversations WHERE user_id = \? ORDER BY created_at DESC LIMIT \?',\s*\[userId, limit\]\s*\);/;

if (!searchPattern.test(content)) {
  console.log('ERROR: Cannot find the target pattern');
  process.exit(1);
}

// Add reverse() after the query
content = content.replace(
  searchPattern,
  `const conversations = await db.all(
      'SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );
    
    // Reverse to show in chronological order (oldest first, newest last)
    conversations.reverse();`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Added reverse() to show conversations in chronological order');
console.log('Result: DESC query gets newest 50 records, reverse() shows them oldest-first');
