const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Deleting All Authorization Records ===\n');

// Count existing records
const count = db.prepare('SELECT COUNT(*) as count FROM report_authorizations').get();
console.log('Total authorization records:', count.count);

// Delete all
const result = db.prepare('DELETE FROM report_authorizations').run();
console.log('Deleted:', result.changes, 'records');

// Verify
const remaining = db.prepare('SELECT COUNT(*) as count FROM report_authorizations').get();
console.log('Remaining records:', remaining.count);

db.close();
console.log('\n=== Cleanup Complete ===');
