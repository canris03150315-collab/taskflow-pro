const Database = require('better-sqlite3');

console.log('=== Check Backup BEFORE Restore Operation ===');
console.log('Backup: 2026-01-27 18:00 (Before restore at 2026-01-28 00:48)\n');

const db = new Database('/app/backup_before_restore.db', { readonly: true });

// Summary
const announcements = db.prepare('SELECT COUNT(*) as count FROM announcements').get();
const tasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
const workLogs = db.prepare('SELECT COUNT(*) as count FROM work_logs').get();
const attendance = db.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
const reports = db.prepare('SELECT COUNT(*) as count FROM reports').get();
const memos = db.prepare('SELECT COUNT(*) as count FROM memos').get();

console.log('📊 Data Summary:');
console.log(`  Announcements: ${announcements.count}`);
console.log(`  Tasks: ${tasks.count}`);
console.log(`  Work Logs: ${workLogs.count}`);
console.log(`  Attendance Records: ${attendance.count}`);
console.log(`  Reports: ${reports.count}`);
console.log(`  Memos: ${memos.count}`);

// All announcements
const allAnn = db.prepare('SELECT title, created_at FROM announcements ORDER BY created_at DESC').all();
console.log(`\n📢 All Announcements (${allAnn.length}):`);
allAnn.forEach((a, idx) => console.log(`  ${idx + 1}. ${a.title}`));

// All tasks
const allTasks = db.prepare('SELECT title, status FROM tasks ORDER BY created_at DESC').all();
console.log(`\n📋 All Tasks (${allTasks.length}):`);
allTasks.forEach((t, idx) => console.log(`  ${idx + 1}. ${t.title} (${t.status})`));

// Work logs by date
const workLogsByDate = db.prepare(`
  SELECT date, COUNT(*) as count 
  FROM work_logs 
  GROUP BY date 
  ORDER BY date DESC 
  LIMIT 15
`).all();
console.log(`\n📝 Work Logs by Date (last 15):`);
workLogsByDate.forEach(w => {
  const logs = db.prepare('SELECT user_id FROM work_logs WHERE date = ?').all(w.date);
  const users = logs.map(l => {
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(l.user_id);
    return user?.name || l.user_id;
  });
  console.log(`  ${w.date}: ${w.count} (${users.join(', ')})`);
});

// Check 26-29 specifically
const dates = ['2026-01-26', '2026-01-27', '2026-01-28', '2026-01-29'];
console.log(`\n📝 Work Logs for Jan 26-29:`);
dates.forEach(date => {
  const count = db.prepare('SELECT COUNT(*) as count FROM work_logs WHERE date = ?').get(date);
  if (count.count > 0) {
    const logs = db.prepare('SELECT user_id FROM work_logs WHERE date = ?').all(date);
    const users = logs.map(l => {
      const user = db.prepare('SELECT name FROM users WHERE id = ?').get(l.user_id);
      return user?.name || l.user_id;
    });
    console.log(`  ${date}: ${count.count} (${users.join(', ')})`);
  } else {
    console.log(`  ${date}: 0`);
  }
});

// Attendance 26-29
console.log(`\n⏰ Attendance Records for Jan 26-29:`);
dates.forEach(date => {
  const count = db.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE date = ?').get(date);
  if (count.count > 0) {
    const records = db.prepare('SELECT user_id, clock_in, clock_out FROM attendance_records WHERE date = ?').all(date);
    console.log(`  ${date}: ${count.count} records`);
    records.forEach(r => {
      const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
      console.log(`    - ${user?.name || r.user_id}: ${r.clock_in} to ${r.clock_out || 'NULL'}`);
    });
  } else {
    console.log(`  ${date}: 0`);
  }
});

// Reports 26-29
console.log(`\n📊 Reports for Jan 26-29:`);
dates.forEach(date => {
  const count = db.prepare(`SELECT COUNT(*) as count FROM reports WHERE DATE(created_at) = ?`).get(date);
  if (count.count > 0) {
    const reps = db.prepare(`SELECT type, user_id FROM reports WHERE DATE(created_at) = ?`).all(date);
    const users = reps.map(r => {
      const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
      return `${user?.name || r.user_id}(${r.type})`;
    });
    console.log(`  ${date}: ${count.count} (${users.join(', ')})`);
  } else {
    console.log(`  ${date}: 0`);
  }
});

db.close();

// Compare with current
console.log(`\n\n${'='.repeat(80)}`);
console.log('CURRENT DATABASE');
console.log('='.repeat(80));

const currentDb = new Database('/app/data/taskflow.db');

const currentAnn = currentDb.prepare('SELECT COUNT(*) as count FROM announcements').get();
const currentTasks = currentDb.prepare('SELECT COUNT(*) as count FROM tasks').get();
const currentLogs = currentDb.prepare('SELECT COUNT(*) as count FROM work_logs').get();
const currentAtt = currentDb.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
const currentReports = currentDb.prepare('SELECT COUNT(*) as count FROM reports').get();
const currentMemos = currentDb.prepare('SELECT COUNT(*) as count FROM memos').get();

console.log('\n📊 Current Summary:');
console.log(`  Announcements: ${currentAnn.count}`);
console.log(`  Tasks: ${currentTasks.count}`);
console.log(`  Work Logs: ${currentLogs.count}`);
console.log(`  Attendance Records: ${currentAtt.count}`);
console.log(`  Reports: ${currentReports.count}`);
console.log(`  Memos: ${currentMemos.count}`);

console.log(`\n📝 Current Work Logs for Jan 26-29:`);
dates.forEach(date => {
  const count = currentDb.prepare('SELECT COUNT(*) as count FROM work_logs WHERE date = ?').get(date);
  console.log(`  ${date}: ${count.count}`);
});

currentDb.close();

console.log('\n' + '='.repeat(80));
console.log('=== COMPARISON ===');
console.log(`Work Logs: Backup=${workLogs.count}, Current=${currentLogs.count}, Difference=${workLogs.count - currentLogs.count}`);
console.log(`Reports: Backup=${reports.count}, Current=${currentReports.count}, Difference=${reports.count - currentReports.count}`);
console.log(`Attendance: Backup=${attendance.count}, Current=${currentAtt.count}, Difference=${attendance.count - currentAtt.count}`);
console.log('='.repeat(80));
