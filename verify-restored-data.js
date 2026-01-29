const Database = require('better-sqlite3');

console.log('=== Verify Restored Data ===\n');

const db = new Database('/app/data/taskflow.db');

// Test 1: Check announcements
console.log('Test 1: Announcements');
const announcements = db.prepare('SELECT COUNT(*) as count FROM announcements').get();
console.log('Total announcements:', announcements.count);

const recentAnn = db.prepare('SELECT title, created_at FROM announcements ORDER BY created_at DESC LIMIT 5').all();
console.log('Recent announcements:');
recentAnn.forEach(a => console.log(`  - ${a.title} (${a.created_at})`));

// Test 2: Check attendance records
console.log('\nTest 2: Attendance Records');
const attendance = db.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
console.log('Total attendance records:', attendance.count);

const dates = ['2026-01-26', '2026-01-27', '2026-01-28', '2026-01-29'];
console.log('Attendance by date:');
dates.forEach(date => {
  const count = db.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE date = ?').get(date);
  console.log(`  ${date}: ${count.count} records`);
  
  if (count.count > 0) {
    const records = db.prepare('SELECT user_id, clock_in, clock_out FROM attendance_records WHERE date = ? LIMIT 3').all(date);
    records.forEach(r => {
      const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
      console.log(`    - ${user?.name || r.user_id}: ${r.clock_in} to ${r.clock_out || 'NULL'}`);
    });
  }
});

// Test 3: Check work logs
console.log('\nTest 3: Work Logs');
const workLogs = db.prepare('SELECT COUNT(*) as count FROM work_logs').get();
console.log('Total work logs:', workLogs.count);

console.log('Work logs by date:');
dates.forEach(date => {
  const count = db.prepare('SELECT COUNT(*) as count FROM work_logs WHERE date = ?').get(date);
  console.log(`  ${date}: ${count.count} logs`);
});

// Test 4: Check schedules
console.log('\nTest 4: Schedules');
const schedules = db.prepare('SELECT COUNT(*) as count FROM schedules').get();
console.log('Total schedules:', schedules.count);

const recentSchedules = db.prepare('SELECT year, month, COUNT(*) as count FROM schedules GROUP BY year, month ORDER BY year DESC, month DESC LIMIT 3').all();
console.log('Schedules by month:');
recentSchedules.forEach(s => console.log(`  ${s.year}-${s.month}: ${s.count} schedules`));

db.close();

console.log('\n=== Verification Complete ===');
console.log('If data looks correct, the restore was successful!');
