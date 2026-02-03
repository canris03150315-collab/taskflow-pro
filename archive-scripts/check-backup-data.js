const Database = require('better-sqlite3');

console.log('=== Checking Recent Backups for Missing Data ===\n');

const backupsToCheck = [
  '/root/taskflow-backups/taskflow_backup_20260129_140001.db',
  '/root/taskflow-backups/taskflow_backup_20260128_120001.db',
  '/root/taskflow-backups/taskflow_backup_20260127_120001.db'
];

backupsToCheck.forEach(backupPath => {
  console.log('Checking: ' + backupPath);
  
  try {
    const db = new Database(backupPath, { readonly: true });
    
    // Check attendance_records
    const attendance = db.prepare(`
      SELECT MIN(date) as min_date, MAX(date) as max_date, COUNT(*) as count
      FROM attendance_records
    `).get();
    
    // Check routine_records
    const routine = db.prepare(`
      SELECT MIN(date) as min_date, MAX(date) as max_date, COUNT(*) as count
      FROM routine_records
    `).get();
    
    // Check work_logs
    const workLogs = db.prepare(`
      SELECT MIN(date) as min_date, MAX(date) as max_date, COUNT(*) as count
      FROM work_logs
    `).get();
    
    console.log('  Attendance: ' + attendance.count + ' records (' + attendance.min_date + ' to ' + attendance.max_date + ')');
    console.log('  Routine: ' + routine.count + ' records (' + routine.min_date + ' to ' + routine.max_date + ')');
    console.log('  Work Logs: ' + workLogs.count + ' records (' + workLogs.min_date + ' to ' + workLogs.max_date + ')');
    
    // Check if this backup has data after 2026-01-26
    const hasRecentData = 
      (attendance.max_date && attendance.max_date > '2026-01-26') ||
      (routine.max_date && routine.max_date > '2026-01-26') ||
      (workLogs.max_date && workLogs.max_date > '2026-01-26');
    
    if (hasRecentData) {
      console.log('  Status: HAS DATA AFTER JAN 26 - Can be used for recovery!');
    } else {
      console.log('  Status: No data after Jan 26');
    }
    
    db.close();
    
  } catch (error) {
    console.log('  Error: ' + error.message);
  }
  
  console.log('');
});

console.log('=== Analysis Complete ===');
console.log('');
console.log('Current database status:');
console.log('  Attendance: Latest 2026-01-26');
console.log('  Routine: Latest 2026-01-26');
console.log('  Work Logs: Latest 2026-01-25');
console.log('');
console.log('If recent backups have data after Jan 26, we can restore from them.');
