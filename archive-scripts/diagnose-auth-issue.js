const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Diagnosing Auth Issue ===\n');

try {
  // Check if users table exists
  console.log('[1/4] Checking users table...');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").all();
  if (tables.length === 0) {
    console.error('ERROR: users table does not exist!');
    process.exit(1);
  }
  console.log('OK users table exists\n');

  // Check users count
  console.log('[2/4] Checking users count...');
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log('Total users: ' + userCount.count);
  
  if (userCount.count === 0) {
    console.error('ERROR: No users in database!');
    process.exit(1);
  }
  console.log('');

  // Check table structure
  console.log('[3/4] Checking users table structure...');
  const tableInfo = db.prepare('PRAGMA table_info(users)').all();
  console.log('Columns: ' + tableInfo.map(col => col.name).join(', '));
  console.log('');

  // Test query
  console.log('[4/4] Testing user query...');
  const users = db.prepare('SELECT id, username, name, role FROM users LIMIT 3').all();
  console.log('Sample users:');
  users.forEach(u => {
    console.log('  - ' + u.username + ' (' + u.role + ')');
  });
  console.log('');

  console.log('SUCCESS: Database appears healthy');

} catch (error) {
  console.error('ERROR:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
} finally {
  db.close();
}
