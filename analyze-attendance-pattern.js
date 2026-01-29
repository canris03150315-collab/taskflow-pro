const Database = require('better-sqlite3');

console.log('=== Analyze Attendance Pattern ===\n');

const dbPath = '/app/data/taskflow.db';
const db = new Database(dbPath);

// Test 1: Check attendance pattern by date
console.log('Test 1: Attendance pattern by date (last 30 days)');
const allRecords = db.prepare(`
  SELECT date, COUNT(*) as count
  FROM attendance_records
  WHERE date >= date('now', '-30 days')
  GROUP BY date
  ORDER BY date DESC
`).all();

console.log('Date          Day      Count');
console.log('--------------------------------');
allRecords.forEach(r => {
  const date = new Date(r.date + 'T00:00:00Z');
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayOfWeek = dayNames[date.getUTCDay()];
  console.log(`${r.date}  ${dayOfWeek}      ${r.count}`);
});

// Test 2: Check user attendance for 27-29
console.log('\nTest 2: User attendance details for Jan 27-29');
const dates = ['2026-01-27', '2026-01-28', '2026-01-29'];

dates.forEach(date => {
  const records = db.prepare('SELECT * FROM attendance_records WHERE date = ?').all(date);
  console.log(`\n${date}:`);
  if (records.length === 0) {
    console.log('  No records');
  } else {
    records.forEach(r => {
      const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
      console.log(`  - ${user?.name || r.user_id}: ${r.clock_in} to ${r.clock_out || 'still working'}`);
    });
  }
});

// Test 3: Check active users
console.log('\nTest 3: Active users (who usually clock in)');
const activeUsers = db.prepare(`
  SELECT user_id, COUNT(DISTINCT date) as days_worked, MAX(date) as last_date
  FROM attendance_records
  WHERE date >= '2026-01-01'
  GROUP BY user_id
  ORDER BY days_worked DESC
`).all();

console.log('User          Days Worked  Last Date');
console.log('----------------------------------------');
activeUsers.forEach(u => {
  const user = db.prepare('SELECT name, role FROM users WHERE id = ?').get(u.user_id);
  const name = user?.name || u.user_id;
  const role = user?.role || '?';
  console.log(`${name.padEnd(12)} ${String(u.days_worked).padEnd(12)} ${u.last_date} (${role})`);
});

// Test 4: Summary
console.log('\n=== Summary ===');
console.log('Total records in database:', db.prepare('SELECT COUNT(*) as count FROM attendance_records').get().count);
console.log('Records on 2026-01-26 (Sun):', db.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE date = ?').get('2026-01-26').count);
console.log('Records on 2026-01-27 (Mon):', db.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE date = ?').get('2026-01-27').count);
console.log('Records on 2026-01-28 (Tue):', db.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE date = ?').get('2026-01-28').count);
console.log('Records on 2026-01-29 (Wed):', db.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE date = ?').get('2026-01-29').count);

console.log('\nConclusion:');
console.log('- Backend API is working (29th has 1 record)');
console.log('- Database table exists and is accessible');
console.log('- 27th and 28th have ZERO records');
console.log('- This suggests employees did not clock in on those days');
console.log('- OR there was a frontend/network issue preventing clock-in');

db.close();
console.log('\n=== Analysis Complete ===');
