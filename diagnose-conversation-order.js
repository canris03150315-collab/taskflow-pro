const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

const userId = 'admin-1767449914767';

console.log('=== Checking conversation order ===\n');

// Get the actual query that backend uses
console.log('1. Backend query (what API returns):');
const backendQuery = db.prepare(
  'SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT 5'
).all(userId);

console.log('Backend returns (DESC order):');
backendQuery.forEach((conv, index) => {
  console.log(`  ${index + 1}. [${conv.role}] ${conv.message.substring(0, 40)}... (${conv.created_at})`);
});

console.log('\n2. If we reverse this array:');
const reversed = [...backendQuery].reverse();
reversed.forEach((conv, index) => {
  console.log(`  ${index + 1}. [${conv.role}] ${conv.message.substring(0, 40)}... (${conv.created_at})`);
});

console.log('\n3. Expected display order (chronological):');
console.log('  User says something first, then AI responds');
console.log('  Oldest conversation at top, newest at bottom');

db.close();
