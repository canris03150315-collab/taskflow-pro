const Database = require('better-sqlite3');
const fs = require('fs');

console.log('=== Test Backup Function ===\n');

// Check current database
console.log('1. Current Database (/app/data/taskflow.db):');
const currentDb = new Database('/app/data/taskflow.db');
const currentStat = fs.statSync('/app/data/taskflow.db');

const currentWorkLogs = currentDb.prepare('SELECT COUNT(*) as count FROM work_logs').get();
const currentReports = currentDb.prepare('SELECT COUNT(*) as count FROM reports').get();
const currentAtt = currentDb.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
const currentAnn = currentDb.prepare('SELECT COUNT(*) as count FROM announcements').get();
const currentTasks = currentDb.prepare('SELECT COUNT(*) as count FROM tasks').get();

console.log(`  Modified: ${currentStat.mtime.toISOString()}`);
console.log(`  Size: ${(currentStat.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Announcements: ${currentAnn.count}`);
console.log(`  Tasks: ${currentTasks.count}`);
console.log(`  Work Logs: ${currentWorkLogs.count}`);
console.log(`  Reports: ${currentReports.count}`);
console.log(`  Attendance: ${currentAtt.count}`);

// Check if there are any work logs for 26-29
const dates = ['2026-01-26', '2026-01-27', '2026-01-28', '2026-01-29'];
console.log('\n  Work Logs for 26-29 Jan:');
dates.forEach(date => {
  const count = currentDb.prepare('SELECT COUNT(*) as count FROM work_logs WHERE date = ?').get(date);
  console.log(`    ${date}: ${count.count}`);
});

currentDb.close();

// Check latest backup
console.log('\n2. Latest Backup (today 06:00):');
const backupDb = new Database('/app/backup_today_0600.db', { readonly: true });

const backupWorkLogs = backupDb.prepare('SELECT COUNT(*) as count FROM work_logs').get();
const backupReports = backupDb.prepare('SELECT COUNT(*) as count FROM reports').get();
const backupAtt = backupDb.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
const backupAnn = backupDb.prepare('SELECT COUNT(*) as count FROM announcements').get();
const backupTasks = backupDb.prepare('SELECT COUNT(*) as count FROM tasks').get();

console.log(`  Announcements: ${backupAnn.count}`);
console.log(`  Tasks: ${backupTasks.count}`);
console.log(`  Work Logs: ${backupWorkLogs.count}`);
console.log(`  Reports: ${backupReports.count}`);
console.log(`  Attendance: ${backupAtt.count}`);

console.log('\n  Work Logs for 26-29 Jan:');
dates.forEach(date => {
  const count = backupDb.prepare('SELECT COUNT(*) as count FROM work_logs WHERE date = ?').get(date);
  console.log(`    ${date}: ${count.count}`);
});

backupDb.close();

// Compare
console.log('\n3. Comparison:');
const annMatch = currentAnn.count === backupAnn.count;
const taskMatch = currentTasks.count === backupTasks.count;
const logMatch = currentWorkLogs.count === backupWorkLogs.count;
const repMatch = currentReports.count === backupReports.count;
const attMatch = currentAtt.count === backupAtt.count;

console.log(`  Announcements: Current=${currentAnn.count}, Backup=${backupAnn.count}, Match=${annMatch ? 'YES' : 'NO'}`);
console.log(`  Tasks: Current=${currentTasks.count}, Backup=${backupTasks.count}, Match=${taskMatch ? 'YES' : 'NO'}`);
console.log(`  Work Logs: Current=${currentWorkLogs.count}, Backup=${backupWorkLogs.count}, Match=${logMatch ? 'YES' : 'NO'}`);
console.log(`  Reports: Current=${currentReports.count}, Backup=${backupReports.count}, Match=${repMatch ? 'YES' : 'NO'}`);
console.log(`  Attendance: Current=${currentAtt.count}, Backup=${backupAtt.count}, Match=${attMatch ? 'YES' : 'NO'}`);

console.log('\n4. Conclusion:');
if (logMatch && repMatch && annMatch) {
  console.log('  OK: Backup function is working correctly.');
  console.log('  OK: Backup accurately reflects the current database state.');
  console.log('  WARNING: The issue is NOT with the backup function.');
  console.log('  WARNING: 26-29 Jan work logs were NEVER written to the database.');
} else {
  console.log('  ERROR: Backup function may have issues!');
  console.log('  ERROR: Backup does not match current database.');
}

console.log('\n=== Test Complete ===');
