const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Cleaning Expired Authorizations ===\n');

// 1. Find expired active authorizations
const expiredAuths = db.prepare(`
  SELECT id, requester_id, expires_at
  FROM report_authorizations
  WHERE is_active = 1 
    AND datetime(expires_at) <= datetime('now')
`).all();

console.log('Found', expiredAuths.length, 'expired active authorizations');

// 2. Deactivate them
if (expiredAuths.length > 0) {
  const stmt = db.prepare(`
    UPDATE report_authorizations
    SET is_active = 0
    WHERE is_active = 1 
      AND datetime(expires_at) <= datetime('now')
  `);
  
  const result = stmt.run();
  console.log('Deactivated', result.changes, 'expired authorizations');
}

// 3. Show remaining active authorizations
const activeAuths = db.prepare(`
  SELECT id, requester_id, expires_at
  FROM report_authorizations
  WHERE is_active = 1
`).all();

console.log('\nRemaining active authorizations:', activeAuths.length);
activeAuths.forEach(auth => {
  console.log('  Requester:', auth.requester_id);
  console.log('  Expires:', auth.expires_at);
  console.log('  ---');
});

db.close();
console.log('\n=== Cleanup Complete ===');
