const Database = require('better-sqlite3');

console.log('=== Attendance Records Diagnosis (Fixed) ===\n');

const dbPath = '/app/data/taskflow.db';
const db = new Database(dbPath);

// Test 1: Check table structure
console.log('Test 1: Check attendance_records table structure');
const schema = db.prepare("PRAGMA table_info(attendance_records)").all();
console.log('Columns:', schema.map(c => `${c.name} (${c.type})`).join(', '));

// Test 2: Count total records
console.log('\nTest 2: Count total attendance records');
const totalCount = db.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
console.log('Total records:', totalCount.count);

// Test 3: Check records for Jan 27-29, 2026
console.log('\nTest 3: Check records for Jan 27-29, 2026');
const dates = ['2026-01-27', '2026-01-28', '2026-01-29'];

dates.forEach(date => {
  const count = db.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE date = ?').get(date);
  console.log(`${date}: ${count.count} records`);
  
  if (count.count > 0) {
    const records = db.prepare('SELECT * FROM attendance_records WHERE date = ? LIMIT 3').all(date);
    console.log('  Sample records:', JSON.stringify(records, null, 2));
  }
});

// Test 4: Check all unique dates
console.log('\nTest 4: All unique dates in attendance_records');
const allDates = db.prepare(`
  SELECT DISTINCT date 
  FROM attendance_records 
  ORDER BY date DESC 
  LIMIT 20
`).all();
console.log('Recent dates:', allDates.map(d => d.date).join(', '));

// Test 5: Check recent records (last 10 days)
console.log('\nTest 5: Check recent records (last 10 days)');
const recentRecords = db.prepare(`
  SELECT date, COUNT(*) as count 
  FROM attendance_records 
  WHERE date >= date('now', '-10 days')
  GROUP BY date 
  ORDER BY date DESC
`).all();

if (recentRecords.length > 0) {
  console.log('Recent attendance by date:');
  recentRecords.forEach(r => {
    console.log(`  ${r.date}: ${r.count} records`);
  });
} else {
  console.log('No records found in last 10 days!');
}

// Test 6: Check latest record
console.log('\nTest 6: Latest attendance record');
const latest = db.prepare('SELECT * FROM attendance_records ORDER BY created_at DESC LIMIT 1').get();
if (latest) {
  console.log('Latest record:', JSON.stringify(latest, null, 2));
} else {
  console.log('No records found!');
}

// Test 7: Check by user (last 7 days)
console.log('\nTest 7: Check attendance by user (last 7 days)');
const userAttendance = db.prepare(`
  SELECT user_id, date, COUNT(*) as count
  FROM attendance_records
  WHERE date >= date('now', '-7 days')
  GROUP BY user_id, date
  ORDER BY date DESC, user_id
  LIMIT 30
`).all();

if (userAttendance.length > 0) {
  console.log('User attendance (last 7 days):');
  userAttendance.forEach(r => {
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
    console.log(`  ${r.date} - ${user?.name || r.user_id}: ${r.count} records`);
  });
} else {
  console.log('No user attendance found in last 7 days!');
}

// Test 8: Check if there are records with specific dates
console.log('\nTest 8: Check specific date ranges');
const jan26 = db.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE date = ?').get('2026-01-26');
const jan25 = db.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE date = ?').get('2026-01-25');
const jan24 = db.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE date = ?').get('2026-01-24');

console.log('2026-01-26:', jan26.count, 'records');
console.log('2026-01-25:', jan25.count, 'records');
console.log('2026-01-24:', jan24.count, 'records');

// Test 9: Check if date field has correct format
console.log('\nTest 9: Check date field format');
const sampleDates = db.prepare('SELECT DISTINCT date FROM attendance_records ORDER BY date DESC LIMIT 10').all();
console.log('Sample date formats:', sampleDates.map(d => d.date).join(', '));

db.close();
console.log('\n=== Diagnosis Complete ===');
