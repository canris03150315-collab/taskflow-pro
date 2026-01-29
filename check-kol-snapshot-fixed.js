const Database = require('better-sqlite3');

console.log('=== Check v8.9.180-kol-payment-stats-complete Snapshot ===\n');
console.log('Snapshot created: 2026-01-28 01:41 (Taiwan Time UTC+8)');
console.log('This is AFTER the restore operation (2026-01-28 00:48-01:07)\n');

const snapshotDb = new Database('/app/kol-snapshot.db', { readonly: true });

// Test 1: Announcements
console.log('Test 1: Announcements');
const announcements = snapshotDb.prepare('SELECT COUNT(*) as count FROM announcements').get();
console.log('Total announcements:', announcements.count);

const annList = snapshotDb.prepare('SELECT title, created_at FROM announcements ORDER BY created_at DESC').all();
annList.forEach((a, i) => {
  console.log(`  ${i + 1}. ${a.title} (${a.created_at})`);
});

// Test 2: Attendance Records
console.log('\nTest 2: Attendance Records');
const attendance = snapshotDb.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
console.log('Total attendance records:', attendance.count);

const dates = ['2026-01-26', '2026-01-27', '2026-01-28', '2026-01-29'];
console.log('\nAttendance by date:');
dates.forEach(date => {
  const count = snapshotDb.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE date = ?').get(date);
  console.log(`  ${date}: ${count.count} records`);
  
  if (count.count > 0) {
    const records = snapshotDb.prepare('SELECT user_id, clock_in, clock_out, status FROM attendance_records WHERE date = ?').all(date);
    records.forEach(r => {
      const user = snapshotDb.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
      console.log(`    - ${user?.name || r.user_id}: ${r.clock_in} to ${r.clock_out || 'NULL'} (${r.status})`);
    });
  }
});

// Test 3: Work Logs
console.log('\nTest 3: Work Logs');
const workLogs = snapshotDb.prepare('SELECT COUNT(*) as count FROM work_logs').get();
console.log('Total work logs:', workLogs.count);

console.log('\nWork logs by date:');
dates.forEach(date => {
  const count = snapshotDb.prepare('SELECT COUNT(*) as count FROM work_logs WHERE date = ?').get(date);
  console.log(`  ${date}: ${count.count} logs`);
  
  if (count.count > 0) {
    const logs = snapshotDb.prepare('SELECT user_id, created_at FROM work_logs WHERE date = ?').all(date);
    logs.forEach(log => {
      const user = snapshotDb.prepare('SELECT name FROM users WHERE id = ?').get(log.user_id);
      console.log(`    - ${user?.name || log.user_id} (${log.created_at})`);
    });
  }
});

// Test 4: Schedules
console.log('\nTest 4: Schedules');
const schedules = snapshotDb.prepare('SELECT COUNT(*) as count FROM schedules').get();
console.log('Total schedules:', schedules.count);

const schedulesByMonth = snapshotDb.prepare(`
  SELECT year, month, COUNT(*) as count 
  FROM schedules 
  GROUP BY year, month 
  ORDER BY year DESC, month DESC
`).all();

console.log('Schedules by month:');
schedulesByMonth.forEach(s => {
  console.log(`  ${s.year}-${s.month}: ${s.count} schedules`);
});

// Test 5: Recent work logs
console.log('\nTest 5: Recent work logs (last 10)');
const recentLogs = snapshotDb.prepare(`
  SELECT date, user_id, created_at
  FROM work_logs
  ORDER BY date DESC, created_at DESC
  LIMIT 10
`).all();

if (recentLogs.length > 0) {
  recentLogs.forEach(log => {
    const user = snapshotDb.prepare('SELECT name FROM users WHERE id = ?').get(log.user_id);
    console.log(`  ${log.date}: ${user?.name || log.user_id} (${log.created_at})`);
  });
} else {
  console.log('  No recent work logs found');
}

snapshotDb.close();

console.log('\n=== Snapshot Check Complete ===');
