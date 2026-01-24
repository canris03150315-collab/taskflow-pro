const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

const userId = 'admin-1767449914767';
const limit = 50;

// Simulate the exact backend logic
const conversations = db.prepare(
  'SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
).all(userId, limit);

console.log('Backend query result (DESC):');
console.log('Total:', conversations.length);
console.log('\nFirst 3 (newest):');
conversations.slice(0, 3).forEach((conv, i) => {
  console.log(`${i + 1}. [${conv.role}] ${conv.message.substring(0, 40)}... (${conv.created_at})`);
});

// After reverse
conversations.reverse();

console.log('\nAfter reverse (what API returns):');
console.log('\nLast 3 (newest after reverse):');
conversations.slice(-3).forEach((conv, i) => {
  console.log(`${i + 1}. [${conv.role}] ${conv.message.substring(0, 40)}... (${conv.created_at})`);
});

db.close();
