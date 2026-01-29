const Database = require('better-sqlite3');

console.log('=== Detailed Database Check ===\n');

const db = new Database('/app/data/taskflow.db');

// Check database file modification time
const fs = require('fs');
const stat = fs.statSync('/app/data/taskflow.db');
console.log('Database file info:');
console.log('  Modified:', stat.mtime.toISOString());
console.log('  Size:', (stat.size / 1024 / 1024).toFixed(2), 'MB');

// Test 1: Check announcements in detail
console.log('\nTest 1: All Announcements');
const announcements = db.prepare('SELECT id, title, created_at FROM announcements ORDER BY created_at DESC').all();
console.log('Total:', announcements.count);
announcements.forEach((a, i) => {
  console.log(`${i + 1}. ${a.title} (${a.created_at})`);
});

// Test 2: Check attendance records in detail
console.log('\nTest 2: Attendance Records Detail');
const totalAtt = db.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
console.log('Total attendance records:', totalAtt.count);

const dates = ['2026-01-26', '2026-01-27', '2026-01-28', '2026-01-29'];
dates.forEach(date => {
  const records = db.prepare('SELECT * FROM attendance_records WHERE date = ?').all(date);
  console.log(`\n${date}: ${records.length} records`);
  records.forEach(r => {
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
    console.log(`  - ${user?.name || r.user_id}`);
    console.log(`    Clock in: ${r.clock_in}`);
    console.log(`    Clock out: ${r.clock_out || 'NULL'}`);
    console.log(`    Status: ${r.status}`);
    console.log(`    Created: ${r.created_at}`);
  });
});

// Test 3: Check work logs
console.log('\nTest 3: Work Logs Detail');
const totalLogs = db.prepare('SELECT COUNT(*) as count FROM work_logs').get();
console.log('Total work logs:', totalLogs.count);

dates.forEach(date => {
  const logs = db.prepare('SELECT * FROM work_logs WHERE date = ?').all(date);
  console.log(`\n${date}: ${logs.length} logs`);
  logs.forEach(log => {
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(log.user_id);
    console.log(`  - ${user?.name || log.user_id}`);
    console.log(`    Created: ${log.created_at}`);
  });
});

// Test 4: Check schedules
console.log('\nTest 4: Schedules Detail');
const schedules = db.prepare('SELECT * FROM schedules ORDER BY year DESC, month DESC, day DESC LIMIT 20').all();
console.log('Total schedules:', db.prepare('SELECT COUNT(*) as count FROM schedules').get().count);
console.log('Recent schedules:');
schedules.forEach(s => {
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(s.user_id);
  console.log(`  ${s.year}-${s.month}-${s.day}: ${user?.name || s.user_id} (${s.type})`);
});

db.close();

console.log('\n=== Check Complete ===');
