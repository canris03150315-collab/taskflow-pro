const Database = require('better-sqlite3');

console.log('=== Checking Database Tables ===\n');

// Open backup database
const backupDb = new Database('/app/backup_20260126.db', { readonly: true });

console.log('1. Backup database tables:\n');
const backupTables = backupDb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Total tables:', backupTables.length);
backupTables.forEach((t, i) => {
  console.log(`  ${i + 1}. ${t.name}`);
});

backupDb.close();

// Open current database
const currentDb = new Database('/app/data/taskflow.db', { readonly: true });

console.log('\n2. Current database tables:\n');
const currentTables = currentDb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Total tables:', currentTables.length);
currentTables.forEach((t, i) => {
  console.log(`  ${i + 1}. ${t.name}`);
});

// Check if attendance table exists
const hasAttendance = currentTables.some(t => t.name === 'attendance');
console.log('\n3. Attendance table exists in current database:', hasAttendance);

if (hasAttendance) {
  console.log('\n4. Checking attendance records in current database (Jan 23-26):\n');
  const records = currentDb.prepare(`
    SELECT date, COUNT(*) as count 
    FROM attendance 
    WHERE date BETWEEN '2026-01-23' AND '2026-01-26'
    GROUP BY date
    ORDER BY date
  `).all();
  
  console.log('Records by date:');
  if (records.length === 0) {
    console.log('  [WARNING] No attendance records found for Jan 23-26!');
  } else {
    records.forEach(r => {
      console.log(`  ${r.date}: ${r.count} records`);
    });
  }
  
  // Check total attendance records
  const total = currentDb.prepare('SELECT COUNT(*) as count FROM attendance').get();
  console.log('\nTotal attendance records in current database:', total.count);
  
  // Check date range
  const dateRange = currentDb.prepare('SELECT MIN(date) as min_date, MAX(date) as max_date FROM attendance').get();
  console.log('Date range:', dateRange.min_date, 'to', dateRange.max_date);
}

currentDb.close();

console.log('\n=== Check Complete ===');
