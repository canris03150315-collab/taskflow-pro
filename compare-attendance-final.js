const Database = require('better-sqlite3');

console.log('=== Attendance Records Comparison (Jan 23-26, 2026) ===\n');

// Open backup database (Jan 26, 18:00)
const backupDb = new Database('/app/backup_20260126.db', { readonly: true });

// Open current database
const currentDb = new Database('/app/data/taskflow.db', { readonly: true });

console.log('1. Checking backup database (Jan 26, 18:00)...\n');

// Check attendance_records in backup for Jan 23-26
const backupRecords = backupDb.prepare(`
  SELECT id, date, user_id, clock_in, clock_out, status, type
  FROM attendance_records 
  WHERE date BETWEEN '2026-01-23' AND '2026-01-26'
  ORDER BY date, user_id
`).all();

console.log('Backup database - Attendance records (Jan 23-26):');
console.log('Total records:', backupRecords.length);

if (backupRecords.length > 0) {
  // Group by date
  const byDate = {};
  backupRecords.forEach(r => {
    if (!byDate[r.date]) byDate[r.date] = [];
    byDate[r.date].push(r);
  });
  
  console.log('\nRecords by date:');
  Object.keys(byDate).sort().forEach(date => {
    console.log(`  ${date}: ${byDate[date].length} records`);
  });
  
  console.log('\nSample records (first 5):');
  backupRecords.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i + 1}. Date: ${r.date}, User: ${r.user_id}, Clock-in: ${r.clock_in || 'N/A'}, Status: ${r.status || 'N/A'}`);
  });
}

console.log('\n2. Checking current database...\n');

// Check attendance_records in current database for Jan 23-26
const currentRecords = currentDb.prepare(`
  SELECT id, date, user_id, clock_in, clock_out, status, type
  FROM attendance_records 
  WHERE date BETWEEN '2026-01-23' AND '2026-01-26'
  ORDER BY date, user_id
`).all();

console.log('Current database - Attendance records (Jan 23-26):');
console.log('Total records:', currentRecords.length);

if (currentRecords.length > 0) {
  // Group by date
  const byDate = {};
  currentRecords.forEach(r => {
    if (!byDate[r.date]) byDate[r.date] = [];
    byDate[r.date].push(r);
  });
  
  console.log('\nRecords by date:');
  Object.keys(byDate).sort().forEach(date => {
    console.log(`  ${date}: ${byDate[date].length} records`);
  });
  
  console.log('\nSample records (first 5):');
  currentRecords.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i + 1}. Date: ${r.date}, User: ${r.user_id}, Clock-in: ${r.clock_in || 'N/A'}, Status: ${r.status || 'N/A'}`);
  });
}

console.log('\n3. Comparison Result...\n');

const diff = backupRecords.length - currentRecords.length;

if (diff > 0) {
  console.log(`[WARNING] Current database is MISSING ${diff} records!`);
  console.log('Backup has:', backupRecords.length, 'records');
  console.log('Current has:', currentRecords.length, 'records');
  console.log('\n=> DATA LOSS DETECTED!');
} else if (diff < 0) {
  console.log(`[INFO] Current database has ${Math.abs(diff)} MORE records than backup`);
  console.log('Backup has:', backupRecords.length, 'records');
  console.log('Current has:', currentRecords.length, 'records');
  console.log('\n=> New records added after backup');
} else {
  console.log('[OK] Both databases have the same number of records:', backupRecords.length);
}

// Find missing records if any
if (diff > 0) {
  console.log('\n4. Detailed Missing Records Analysis...\n');
  
  const currentIds = new Set(currentRecords.map(r => r.id));
  const missing = backupRecords.filter(r => !currentIds.has(r.id));
  
  console.log('Missing records count:', missing.length);
  
  if (missing.length > 0) {
    // Group missing by date
    const missingByDate = {};
    missing.forEach(r => {
      if (!missingByDate[r.date]) missingByDate[r.date] = [];
      missingByDate[r.date].push(r);
    });
    
    console.log('\nMissing records by date:');
    Object.keys(missingByDate).sort().forEach(date => {
      console.log(`\n  ${date}: ${missingByDate[date].length} missing records`);
      missingByDate[date].forEach((r, i) => {
        console.log(`    ${i + 1}. ID: ${r.id}, User: ${r.user_id}, Clock-in: ${r.clock_in || 'N/A'}, Clock-out: ${r.clock_out || 'N/A'}, Status: ${r.status || 'N/A'}, Type: ${r.type || 'N/A'}`);
      });
    });
  }
}

// Check overall statistics
console.log('\n5. Overall Statistics...\n');

const backupTotal = backupDb.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
const currentTotal = currentDb.prepare('SELECT COUNT(*) as count FROM attendance_records').get();

console.log('Total attendance records (all dates):');
console.log('  Backup:', backupTotal.count);
console.log('  Current:', currentTotal.count);
console.log('  Difference:', backupTotal.count - currentTotal.count);

const backupRange = backupDb.prepare('SELECT MIN(date) as min_date, MAX(date) as max_date FROM attendance_records').get();
const currentRange = currentDb.prepare('SELECT MIN(date) as min_date, MAX(date) as max_date FROM attendance_records').get();

console.log('\nDate range:');
console.log('  Backup:', backupRange.min_date, 'to', backupRange.max_date);
console.log('  Current:', currentRange.min_date, 'to', currentRange.max_date);

backupDb.close();
currentDb.close();

console.log('\n=== Comparison Complete ===');
