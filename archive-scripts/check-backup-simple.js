const Database = require('better-sqlite3');

console.log('=== Checking Backup Database ===\n');

const db = new Database('/tmp/backup-check.db', { readonly: true });

// Check attendance_records
console.log('Attendance Records:');
const attendance = db.prepare(`
  SELECT MIN(date) as min_date, MAX(date) as max_date, COUNT(*) as count
  FROM attendance_records
`).get();
console.log('  Total:', attendance.count);
console.log('  Range:', attendance.min_date, 'to', attendance.max_date);

const attendanceAfter26 = db.prepare(`
  SELECT COUNT(*) as count FROM attendance_records WHERE date > '2026-01-26'
`).get();
console.log('  After Jan 26:', attendanceAfter26.count);
console.log('');

// Check routine_records
console.log('Routine Records:');
const routine = db.prepare(`
  SELECT MIN(date) as min_date, MAX(date) as max_date, COUNT(*) as count
  FROM routine_records
`).get();
console.log('  Total:', routine.count);
console.log('  Range:', routine.min_date, 'to', routine.max_date);

const routineAfter26 = db.prepare(`
  SELECT COUNT(*) as count FROM routine_records WHERE date > '2026-01-26'
`).get();
console.log('  After Jan 26:', routineAfter26.count);
console.log('');

// Check work_logs
console.log('Work Logs:');
const workLogs = db.prepare(`
  SELECT MIN(date) as min_date, MAX(date) as max_date, COUNT(*) as count
  FROM work_logs
`).get();
console.log('  Total:', workLogs.count);
console.log('  Range:', workLogs.min_date, 'to', workLogs.max_date);

const workLogsAfter26 = db.prepare(`
  SELECT COUNT(*) as count FROM work_logs WHERE date > '2026-01-26'
`).get();
console.log('  After Jan 26:', workLogsAfter26.count);
console.log('');

db.close();

console.log('=== Result ===\n');

const hasRecoveryData = 
  attendanceAfter26.count > 0 || 
  routineAfter26.count > 0 || 
  workLogsAfter26.count > 0;

if (hasRecoveryData) {
  console.log('[SUCCESS] This backup contains data after Jan 26!');
  console.log('');
  console.log('Recoverable data:');
  if (attendanceAfter26.count > 0) {
    console.log('  - Attendance: ' + attendanceAfter26.count + ' records');
  }
  if (routineAfter26.count > 0) {
    console.log('  - Routine: ' + routineAfter26.count + ' records');
  }
  if (workLogsAfter26.count > 0) {
    console.log('  - Work Logs: ' + workLogsAfter26.count + ' records');
  }
  console.log('');
  console.log('This backup can be used to restore missing data!');
} else {
  console.log('[WARNING] This backup also stops at Jan 26');
  console.log('Need to check other backups');
}
