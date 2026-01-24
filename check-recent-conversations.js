const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

const userId = 'admin-1767449914767';

// Get total count
const total = db.prepare('SELECT COUNT(*) as count FROM ai_conversations WHERE user_id = ?').get(userId);
console.log('Total conversations for user:', total.count);

// Get most recent 10
const recent = db.prepare(
  'SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT 10'
).all(userId);

console.log('\nMost recent 10 conversations:');
recent.forEach((conv, index) => {
  console.log((index + 1) + '. [' + conv.role + '] ' + conv.message.substring(0, 60) + '...');
  console.log('   Created at: ' + conv.created_at);
});

db.close();
