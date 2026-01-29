const Database = require('better-sqlite3');

console.log('=== Check 2026-01-26 18:00 Backup ===');
console.log('This backup was created on Jan 26 at 18:00 (Taiwan Time)\n');

const db = new Database('/app/backup_20260126_18.db', { readonly: true });

// Summary
const workLogs = db.prepare('SELECT COUNT(*) as count FROM work_logs').get();
const reports = db.prepare('SELECT COUNT(*) as count FROM reports').get();
const attendance = db.prepare('SELECT COUNT(*) as count FROM attendance_records').get();

console.log('📊 Data Summary:');
console.log(`  Work Logs: ${workLogs.count}`);
console.log(`  Reports: ${reports.count}`);
console.log(`  Attendance Records: ${attendance.count}`);

// Work logs by date
const workLogsByDate = db.prepare(`
  SELECT date, COUNT(*) as count 
  FROM work_logs 
  GROUP BY date 
  ORDER BY date DESC 
  LIMIT 20
`).all();
console.log(`\n📝 Work Logs by Date (last 20):`);
workLogsByDate.forEach(w => {
  const logs = db.prepare('SELECT user_id FROM work_logs WHERE date = ?').all(w.date);
  const users = logs.map(l => {
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(l.user_id);
    return user?.name || l.user_id;
  });
  console.log(`  ${w.date}: ${w.count} (${users.join(', ')})`);
});

// Check specific dates
const dates = ['2026-01-24', '2026-01-25', '2026-01-26', '2026-01-27'];
console.log(`\n📝 Work Logs for Jan 24-27:`);
dates.forEach(date => {
  const count = db.prepare('SELECT COUNT(*) as count FROM work_logs WHERE date = ?').get(date);
  if (count.count > 0) {
    const logs = db.prepare('SELECT user_id, created_at FROM work_logs WHERE date = ?').all(date);
    const users = logs.map(l => {
      const user = db.prepare('SELECT name FROM users WHERE id = ?').get(l.user_id);
      return `${user?.name || l.user_id}(${l.created_at})`;
    });
    console.log(`  ${date}: ${count.count}`);
    users.forEach(u => console.log(`    - ${u}`));
  } else {
    console.log(`  ${date}: 0`);
  }
});

// Reports by date
const reportsByDate = db.prepare(`
  SELECT DATE(created_at) as date, COUNT(*) as count 
  FROM reports 
  GROUP BY DATE(created_at) 
  ORDER BY date DESC 
  LIMIT 20
`).all();
console.log(`\n📊 Reports by Date (last 20):`);
reportsByDate.forEach(r => console.log(`  ${r.date}: ${r.count}`));

// Attendance by date
console.log(`\n⏰ Attendance Records for Jan 24-27:`);
dates.forEach(date => {
  const count = db.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE date = ?').get(date);
  if (count.count > 0) {
    const records = db.prepare('SELECT user_id FROM attendance_records WHERE date = ?').all(date);
    const users = records.map(r => {
      const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
      return user?.name || r.user_id;
    });
    console.log(`  ${date}: ${count.count} (${users.join(', ')})`);
  } else {
    console.log(`  ${date}: 0`);
  }
});

db.close();

console.log('\n=== Check Complete ===');
console.log('This backup was created at 18:00 on Jan 26.');
console.log('If employees submitted work logs on Jan 26, they should appear in this backup.');
