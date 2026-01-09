const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Diagnose Authorization Issue ===\n');

// 1. All authorization records
console.log('1. All authorization records:');
const allAuths = db.prepare(`
  SELECT id, requester_id, first_approver_id, is_active, 
         first_approved_at, authorized_at, expires_at, created_at
  FROM report_authorizations
  ORDER BY created_at DESC
  LIMIT 10
`).all();

allAuths.forEach(auth => {
  console.log('  ID:', auth.id);
  console.log('  Requester:', auth.requester_id);
  console.log('  Approver:', auth.first_approver_id);
  console.log('  Is Active:', auth.is_active);
  console.log('  Approved At:', auth.first_approved_at || 'Not approved');
  console.log('  Authorized At:', auth.authorized_at || 'Not authorized');
  console.log('  Expires At:', auth.expires_at || 'None');
  console.log('  Created At:', auth.created_at);
  console.log('  ---');
});

// 2. Active authorizations
console.log('\n2. Active authorizations:');
const activeAuths = db.prepare(`
  SELECT * FROM report_authorizations
  WHERE is_active = 1
`).all();

console.log('  Total:', activeAuths.length);
activeAuths.forEach(auth => {
  console.log('  Requester:', auth.requester_id, 'Expires:', auth.expires_at);
});

// 3. Pending authorizations
console.log('\n3. Pending authorizations:');
const pendingAuths = db.prepare(`
  SELECT * FROM report_authorizations
  WHERE is_active = 0 AND first_approved_at = ''
`).all();

console.log('  Total:', pendingAuths.length);
pendingAuths.forEach(auth => {
  console.log('  Requester:', auth.requester_id, 'Approver:', auth.first_approver_id);
});

db.close();
console.log('\n=== Diagnosis Complete ===');
