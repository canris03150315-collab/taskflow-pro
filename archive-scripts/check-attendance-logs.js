const Database = require('better-sqlite3');

console.log('=== Check Attendance Logs and Patterns ===\n');

const dbPath = '/app/data/taskflow.db';
const db = new Database(dbPath);

// Test 1: Check if there are system logs for attendance
console.log('Test 1: Check system_logs for attendance errors');
const logsExist = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='system_logs'").all();

if (logsExist.length > 0) {
  const attendanceLogs = db.prepare(`
    SELECT * FROM system_logs 
    WHERE message LIKE '%attendance%' 
    OR message LIKE '%clock%'
    ORDER BY created_at DESC 
    LIMIT 20
  `).all();
  
  console.log('Attendance-related logs:', attendanceLogs.length);
  if (attendanceLogs.length > 0) {
    attendanceLogs.forEach(log => {
      console.log(`  [${log.created_at}] ${log.level}: ${log.message}`);
    });
  }
}

// Test 2: Check attendance pattern by day of week
console.log('\nTest 2: Attendance pattern by day of week');
const allRecords = db.prepare(`
  SELECT date, COUNT(*) as count
  FROM attendance_records
  WHERE date >= '2026-01-01'
  GROUP BY date
  ORDER BY date DESC
  LIMIT 30
`).all();

console.log('Recent attendance by date:');
allRecords.forEach(r => {
  const date = new Date(r.date);
  const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
  console.log(`  ${r.date} (${dayOfWeek}): ${r.count} records`);
});

// Test 3: Check if there's a pattern (weekends vs weekdays)
console.log('\nTest 3: Analyze weekend vs weekday pattern');
const weekdayRecords = allRecords.filter(r => {
  const day = new Date(r.date).getDay();
  return day >= 1 && day <= 5; // Mon-Fri
});

const weekendRecords = allRecords.filter(r => {
  const day = new Date(r.date).getDay();
  return day === 0 || day === 6; // Sat-Sun
});

console.log('Weekday records:', weekdayRecords.length, 'days');
console.log('Weekend records:', weekendRecords.length, 'days');

if (weekdayRecords.length > 0) {
  const avgWeekday = weekdayRecords.reduce((sum, r) => sum + r.count, 0) / weekdayRecords.length;
  console.log('Average weekday attendance:', avgWeekday.toFixed(1), 'records/day');
}

if (weekendRecords.length > 0) {
  const avgWeekend = weekendRecords.reduce((sum, r) => sum + r.count, 0) / weekendRecords.length;
  console.log('Average weekend attendance:', avgWeekend.toFixed(1), 'records/day');
}

// Test 4: Check user attendance patterns
console.log('\nTest 4: Check which users usually clock in');
const userStats = db.prepare(`
  SELECT user_id, COUNT(*) as total_days, MAX(date) as last_date
  FROM attendance_records
  WHERE date >= '2026-01-01'
  GROUP BY user_id
  ORDER BY total_days DESC
`).all();

console.log('User attendance stats (Jan 2026):');
userStats.forEach(stat => {
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(stat.user_id);
  console.log(`  ${user?.name || stat.user_id}: ${stat.total_days} days, last: ${stat.last_date}`);
});

// Test 5: Check if 27-28 were holidays
console.log('\nTest 5: Summary');
console.log('2026-01-27 (Mon): 0 records - Unusual for a weekday');
console.log('2026-01-28 (Tue): 0 records - Unusual for a weekday');
console.log('Possible reasons:');
console.log('  1. Company holiday or closure');
console.log('  2. System downtime or API issue');
console.log('  3. Employees forgot to clock in');
console.log('  4. Frontend issue preventing clock-in');

db.close();
console.log('\n=== Analysis Complete ===');
