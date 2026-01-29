const Database = require('better-sqlite3');

console.log('=== Attendance Records Diagnosis ===\n');

const dbPath = '/app/data/taskflow.db';
const db = new Database(dbPath);

// Test 1: Check if attendance table exists
console.log('Test 1: Check if attendance table exists');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance'").all();
console.log('Attendance table exists:', tables.length > 0);

if (tables.length === 0) {
  console.log('ERROR: attendance table does not exist!');
  const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Available tables:', allTables.map(t => t.name).join(', '));
  db.close();
  process.exit(1);
}

// Test 2: Check table structure
console.log('\nTest 2: Check attendance table structure');
const schema = db.prepare("PRAGMA table_info(attendance)").all();
console.log('Columns:', schema.map(c => `${c.name} (${c.type})`).join(', '));

// Test 3: Count total records
console.log('\nTest 3: Count total attendance records');
const totalCount = db.prepare('SELECT COUNT(*) as count FROM attendance').get();
console.log('Total records:', totalCount.count);

// Test 4: Check records for Jan 27-29, 2026
console.log('\nTest 4: Check records for Jan 27-29, 2026');
const dates = ['2026-01-27', '2026-01-28', '2026-01-29'];

dates.forEach(date => {
  const count = db.prepare('SELECT COUNT(*) as count FROM attendance WHERE date = ?').get(date);
  console.log(`${date}: ${count.count} records`);
  
  if (count.count > 0) {
    const records = db.prepare('SELECT * FROM attendance WHERE date = ? LIMIT 3').all(date);
    console.log('  Sample records:', JSON.stringify(records, null, 2));
  }
});

// Test 5: Check recent records (last 10 days)
console.log('\nTest 5: Check recent records (last 10 days)');
const recentRecords = db.prepare(`
  SELECT date, COUNT(*) as count 
  FROM attendance 
  WHERE date >= date('now', '-10 days')
  GROUP BY date 
  ORDER BY date DESC
`).all();

console.log('Recent attendance by date:');
recentRecords.forEach(r => {
  console.log(`  ${r.date}: ${r.count} records`);
});

// Test 6: Check all dates in database
console.log('\nTest 6: All unique dates in attendance table');
const allDates = db.prepare(`
  SELECT DISTINCT date 
  FROM attendance 
  ORDER BY date DESC 
  LIMIT 20
`).all();
console.log('Recent dates:', allDates.map(d => d.date).join(', '));

// Test 7: Check if there are records with NULL or empty dates
console.log('\nTest 7: Check for NULL or empty dates');
const nullDates = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE date IS NULL OR date = ''").get();
console.log('Records with NULL/empty date:', nullDates.count);

// Test 8: Check latest record
console.log('\nTest 8: Latest attendance record');
const latest = db.prepare('SELECT * FROM attendance ORDER BY created_at DESC LIMIT 1').get();
if (latest) {
  console.log('Latest record:', JSON.stringify(latest, null, 2));
} else {
  console.log('No records found!');
}

// Test 9: Check by user
console.log('\nTest 9: Check attendance by user (last 5 days)');
const userAttendance = db.prepare(`
  SELECT user_id, date, COUNT(*) as count
  FROM attendance
  WHERE date >= date('now', '-5 days')
  GROUP BY user_id, date
  ORDER BY date DESC, user_id
  LIMIT 20
`).all();

if (userAttendance.length > 0) {
  console.log('User attendance (last 5 days):');
  userAttendance.forEach(r => {
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
    console.log(`  ${r.date} - ${user?.name || r.user_id}: ${r.count} records`);
  });
} else {
  console.log('No user attendance found in last 5 days!');
}

db.close();
console.log('\n=== Diagnosis Complete ===');
