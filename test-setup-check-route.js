const Database = require('better-sqlite3');

console.log('=== Testing /setup/check Route Logic ===\n');

try {
  console.log('[1/4] Opening database...');
  const db = new Database('/app/data/taskflow.db');
  console.log('OK Database opened');
  console.log('');
  
  console.log('[2/4] Testing direct query...');
  const result1 = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log('Direct query result:', result1);
  console.log('');
  
  console.log('[3/4] Testing with db.db pattern...');
  const mockReq = { db: db };
  const result2 = mockReq.db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log('db.db pattern result:', result2);
  console.log('');
  
  console.log('[4/4] Checking if db.db exists...');
  console.log('typeof db.db:', typeof db.db);
  console.log('db.db === undefined:', db.db === undefined);
  console.log('');
  
  if (db.db === undefined) {
    console.log('ERROR: db.db is undefined!');
    console.log('This means the Database class does not have a .db property');
    console.log('');
    console.log('SOLUTION: Use db.prepare() directly, not db.db.prepare()');
  } else {
    console.log('OK: db.db exists');
  }
  
  db.close();
  console.log('');
  console.log('SUCCESS: Test complete');
  
} catch (error) {
  console.error('ERROR:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
