const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

const userId = 'admin-1767449914767';

// Get conversations with timestamp 07:57
const conversations = db.prepare(
  "SELECT * FROM ai_conversations WHERE user_id = ? AND created_at LIKE '%11:57%' ORDER BY created_at ASC, rowid ASC"
).all(userId);

console.log('Conversations at 07:57 (11:57 UTC):');
conversations.forEach((conv, index) => {
  console.log(`${index + 1}. [${conv.role}] ${conv.message.substring(0, 50)}...`);
  console.log(`   Created: ${conv.created_at}, RowID: ${conv.rowid || 'N/A'}`);
});

db.close();
