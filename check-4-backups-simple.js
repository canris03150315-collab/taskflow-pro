const Database = require('better-sqlite3');

console.log('=== Check Latest 4 Backups ===\n');

const backups = [
  { name: 'Backup 1 (2026-01-29 06:00)', path: '/app/backup1.db' },
  { name: 'Backup 2 (2026-01-29 00:00)', path: '/app/backup2.db' },
  { name: 'Backup 3 (2026-01-28 18:00)', path: '/app/backup3.db' },
  { name: 'Backup 4 (2026-01-28 12:00)', path: '/app/backup4.db' }
];

backups.forEach((backup, i) => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${backup.name}`);
  console.log('='.repeat(80));
  
  const db = new Database(backup.path, { readonly: true });
  
  // Summary
  const announcements = db.prepare('SELECT COUNT(*) as count FROM announcements').get();
  const tasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
  const workLogs = db.prepare('SELECT COUNT(*) as count FROM work_logs').get();
  const attendance = db.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
  const memos = db.prepare('SELECT COUNT(*) as count FROM memos').get();
  
  console.log(`\n📊 Summary: Ann=${announcements.count}, Tasks=${tasks.count}, WorkLogs=${workLogs.count}, Att=${attendance.count}, Memos=${memos.count}`);
  
  // All announcements
  const allAnn = db.prepare('SELECT title, created_at FROM announcements ORDER BY created_at DESC').all();
  console.log(`\n📢 Announcements (${allAnn.length}):`);
  allAnn.forEach((a, idx) => console.log(`  ${idx + 1}. ${a.title}`));
  
  // All tasks
  const allTasks = db.prepare('SELECT title, status FROM tasks ORDER BY created_at DESC').all();
  console.log(`\n📋 Tasks (${allTasks.length}):`);
  allTasks.forEach((t, idx) => console.log(`  ${idx + 1}. ${t.title} (${t.status})`));
  
  // Work logs recent
  const recentLogs = db.prepare('SELECT date, COUNT(*) as count FROM work_logs GROUP BY date ORDER BY date DESC LIMIT 5').all();
  console.log(`\n📝 Recent Work Logs:`);
  recentLogs.forEach(w => console.log(`  ${w.date}: ${w.count} logs`));
  
  // Attendance 26-29
  const dates = ['2026-01-26', '2026-01-27', '2026-01-28', '2026-01-29'];
  console.log(`\n⏰ Attendance (26-29 Jan):`);
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
});

// Current database
console.log(`\n\n${'='.repeat(80)}`);
console.log('CURRENT DATABASE');
console.log('='.repeat(80));

const currentDb = new Database('/app/data/taskflow.db');

const currentAnn = currentDb.prepare('SELECT COUNT(*) as count FROM announcements').get();
const currentTasks = currentDb.prepare('SELECT COUNT(*) as count FROM tasks').get();
const currentLogs = currentDb.prepare('SELECT COUNT(*) as count FROM work_logs').get();
const currentAtt = currentDb.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
const currentMemos = currentDb.prepare('SELECT COUNT(*) as count FROM memos').get();

console.log(`\n📊 Summary: Ann=${currentAnn.count}, Tasks=${currentTasks.count}, WorkLogs=${currentLogs.count}, Att=${currentAtt.count}, Memos=${currentMemos.count}`);

const currentAllAnn = currentDb.prepare('SELECT title FROM announcements ORDER BY created_at DESC').all();
console.log(`\n📢 Announcements (${currentAllAnn.length}):`);
currentAllAnn.forEach((a, idx) => console.log(`  ${idx + 1}. ${a.title}`));

const currentAllTasks = currentDb.prepare('SELECT title, status FROM tasks ORDER BY created_at DESC').all();
console.log(`\n📋 Tasks (${currentAllTasks.length}):`);
currentAllTasks.forEach((t, idx) => console.log(`  ${idx + 1}. ${t.title} (${t.status})`));

currentDb.close();

console.log('\n' + '='.repeat(80));
console.log('=== Check Complete ===');
