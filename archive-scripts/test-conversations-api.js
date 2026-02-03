const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

// Simulate the GET /conversations API
const userId = 'admin-1767449914767'; // BOSS user ID
const limit = 50;

const conversations = db.prepare(
  'SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY created_at ASC LIMIT ?'
).all(userId, limit);

console.log('User ID:', userId);
console.log('Total conversations for this user:', conversations.length);

if (conversations.length > 0) {
  console.log('\nFirst 3 conversations:');
  conversations.slice(0, 3).forEach((conv, index) => {
    console.log((index + 1) + '. [' + conv.role + '] ' + conv.message.substring(0, 50) + '...');
    console.log('   Created at: ' + conv.created_at);
  });
  
  console.log('\nLast 3 conversations:');
  conversations.slice(-3).forEach((conv, index) => {
    console.log((index + 1) + '. [' + conv.role + '] ' + conv.message.substring(0, 50) + '...');
    console.log('   Created at: ' + conv.created_at);
  });
}

db.close();
