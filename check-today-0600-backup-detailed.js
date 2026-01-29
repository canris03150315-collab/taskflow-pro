const Database = require('better-sqlite3');

console.log('=== Detailed Check: 2026-01-29 06:00 Backup ===');
console.log('File: taskflow_backup_20260129_060001.db\n');

const db = new Database('/app/backup_today_0600.db', { readonly: true });

// Get table schema for work_logs
console.log('=== Work Logs Table Schema ===');
const schema = db.prepare("PRAGMA table_info(work_logs)").all();
schema.forEach(col => {
  console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
});

// Summary
const workLogs = db.prepare('SELECT COUNT(*) as count FROM work_logs').get();
const reports = db.prepare('SELECT COUNT(*) as count FROM reports').get();
const attendance = db.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
const announcements = db.prepare('SELECT COUNT(*) as count FROM announcements').get();
const tasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get();

console.log('\n📊 Data Summary:');
console.log(`  Announcements: ${announcements.count}`);
console.log(`  Tasks: ${tasks.count}`);
console.log(`  Work Logs: ${workLogs.count}`);
console.log(`  Reports: ${reports.count}`);
console.log(`  Attendance Records: ${attendance.count}`);

// ALL work logs with full details
console.log('\n📝 ALL Work Logs (Full Details):');
const allLogs = db.prepare(`
  SELECT * FROM work_logs 
  ORDER BY date DESC, created_at DESC
`).all();

console.log(`Total: ${allLogs.length} work logs\n`);

// Group by date
const byDate = {};
allLogs.forEach(log => {
  if (!byDate[log.date]) byDate[log.date] = [];
  byDate[log.date].push(log);
});

Object.keys(byDate).sort().reverse().forEach(date => {
  console.log(`\n${date}: ${byDate[date].length} logs`);
  byDate[date].forEach(log => {
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(log.user_id);
    console.log(`  - ${user?.name || log.user_id}`);
    console.log(`    ID: ${log.id}`);
    console.log(`    Created: ${log.created_at}`);
    console.log(`    Updated: ${log.updated_at || 'NULL'}`);
  });
});

// Check specific dates in detail
const dates = ['2026-01-24', '2026-01-25', '2026-01-26', '2026-01-27', '2026-01-28', '2026-01-29'];
console.log('\n\n=== Specific Date Check (Jan 24-29) ===');
dates.forEach(date => {
  const count = db.prepare('SELECT COUNT(*) as count FROM work_logs WHERE date = ?').get(date);
  const logs = db.prepare('SELECT * FROM work_logs WHERE date = ?').all(date);
  
  console.log(`\n${date}: ${count.count} work logs`);
  if (logs.length > 0) {
    logs.forEach(log => {
      const user = db.prepare('SELECT name FROM users WHERE id = ?').get(log.user_id);
      console.log(`  - ${user?.name || log.user_id} (ID: ${log.id})`);
      console.log(`    Created: ${log.created_at}`);
    });
  }
});

// Check reports
console.log('\n\n=== Reports Check ===');
const allReports = db.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT 20').all();
console.log(`Total reports: ${reports.count}`);
console.log('Last 20 reports:');
allReports.forEach((r, i) => {
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
  const date = r.created_at.split('T')[0];
  console.log(`  ${i + 1}. [${r.type}] ${date} by ${user?.name || r.user_id}`);
});

db.close();

console.log('\n=== Check Complete ===');
console.log('This backup was created at 06:00 on 2026-01-29 (Taiwan Time)');
