const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const records = db.prepare('SELECT user_id, date, status FROM attendance_records WHERE date >= ? LIMIT 20').all(sevenDaysAgo);

console.log('Sample attendance records:\n');
records.forEach((r, i) => {
  console.log((i + 1) + '. user_id: ' + r.user_id + ', date: ' + r.date + ', status: "' + r.status + '"');
});

console.log('\nUnique status values:');
const allRecords = db.prepare('SELECT DISTINCT status FROM attendance_records').all();
allRecords.forEach(r => {
  console.log('  - "' + r.status + '"');
});

db.close();
