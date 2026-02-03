const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Testing auth setup check...');

try {
  const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log('Users count:', users.count);
  
  if (users.count === 0) {
    console.log('Result: { needsSetup: true }');
  } else {
    console.log('Result: { needsSetup: false }');
  }
} catch (error) {
  console.error('Error:', error.message);
}

db.close();
