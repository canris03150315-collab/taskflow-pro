const Database = require('better-sqlite3');

const dbPath = '/app/data/taskflow.db';
const db = new Database(dbPath);

console.log('=== Checking BOSS user credentials ===\n');

try {
  const users = db.prepare('SELECT id, name, username, role FROM users WHERE role = ?').all('BOSS');
  
  console.log('BOSS users found:', users.length);
  users.forEach(user => {
    console.log(`\nUser: ${user.name}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  ID: ${user.id}`);
  });
  
  console.log('\n⚠️ Note: Cannot display passwords for security reasons');
  console.log('Please try logging in with username "JEN168" (user: 大俠)');
  
  db.close();
  
} catch (error) {
  console.error('Error:', error.message);
}
