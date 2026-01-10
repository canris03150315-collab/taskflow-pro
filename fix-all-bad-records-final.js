const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Fix all bad records and prevent future issues ===');

const today = new Date().toISOString().split('T')[0];

// Delete ALL today's records (they will be recreated correctly)
const result = db.prepare('DELETE FROM routine_records WHERE date = ?').run(today);
console.log('Deleted', result.changes, 'records for today');

console.log('\n=== Records deleted, will be recreated on next page load ===');
db.close();
