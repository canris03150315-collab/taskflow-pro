const Database = require('better-sqlite3');

console.log('=== Check Backup Attendance Records ===\n');

// Check the Jan 26 backup
const backupPath = '/app/data/backups/taskflow-backup-2026-01-26T09-35-56-943Z.db';
console.log('Checking backup:', backupPath);

const backupDb = new Database(backupPath, { readonly: true });

// Test 1: Check total records in backup
console.log('\nTest 1: Total attendance records in backup');
const totalBackup = backupDb.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
console.log('Total records in backup:', totalBackup.count);

// Test 2: Check records for Jan 26-28 in backup
console.log('\nTest 2: Check Jan 26-28 records in backup');
const dates = ['2026-01-26', '2026-01-27', '2026-01-28'];

dates.forEach(date => {
  const count = backupDb.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE date = ?').get(date);
  console.log(`${date}: ${count.count} records`);
  
  if (count.count > 0) {
    const records = backupDb.prepare('SELECT * FROM attendance_records WHERE date = ?').all(date);
    console.log('  Details:');
    records.forEach(r => {
      const user = backupDb.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
      console.log(`    - ${user?.name || r.user_id}: clock_in=${r.clock_in}, clock_out=${r.clock_out || 'NULL'}, status=${r.status}`);
    });
  }
});

// Test 3: Check all dates in backup
console.log('\nTest 3: All unique dates in backup');
const allDates = backupDb.prepare(`
  SELECT DISTINCT date, COUNT(*) as count
  FROM attendance_records
  GROUP BY date
  ORDER BY date DESC
  LIMIT 20
`).all();

console.log('Recent dates in backup:');
allDates.forEach(d => {
  console.log(`  ${d.date}: ${d.count} records`);
});

backupDb.close();

// Now check current database
console.log('\n=== Compare with Current Database ===\n');
const currentDb = new Database('/app/data/taskflow.db');

const totalCurrent = currentDb.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
console.log('Total records in current DB:', totalCurrent.count);

dates.forEach(date => {
  const count = currentDb.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE date = ?').get(date);
  console.log(`${date}: ${count.count} records`);
});

currentDb.close();

console.log('\n=== Analysis Complete ===');
console.log('If backup has more records than current DB, data was lost during snapshot restore!');
