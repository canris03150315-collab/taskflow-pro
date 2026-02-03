const Database = require('better-sqlite3');

console.log('=== Diagnosing Auth Error ===\n');

try {
  // Test database connection
  const db = new Database('/app/data/taskflow.db');
  console.log('1. Database connection: OK');
  
  // Test users table
  const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log('2. Users table:', users.count, 'users');
  
  // Test if BOSS exists
  const boss = db.prepare("SELECT id, username, role FROM users WHERE role = 'BOSS'").get();
  if (boss) {
    console.log('3. BOSS user exists:', boss.username);
  } else {
    console.log('3. BOSS user: NOT FOUND');
  }
  
  // Test auth route logic
  const hasUsers = users.count > 0;
  console.log('4. Setup check should return:', JSON.stringify({ hasUsers }));
  
  db.close();
  console.log('\n=== Diagnosis Complete ===');
  
} catch (error) {
  console.error('ERROR:', error.message);
  console.error('Stack:', error.stack);
}
