const Database = require('better-sqlite3');

console.log('=== Attendance Data Comparison ===\n');

// Open backup database (Jan 26, 18:00) - now in container
const backupDb = new Database('/app/backup_20260126.db', { readonly: true });

// Open current database
const currentDb = new Database('/app/data/taskflow.db', { readonly: true });

console.log('1. Checking backup database (Jan 26, 18:00)...\n');

// Check attendance records in backup for Jan 23-26
const backupRecords = backupDb.prepare(`
  SELECT date, user_id, check_in_time, check_out_time 
  FROM attendance 
  WHERE date BETWEEN '2026-01-23' AND '2026-01-26'
  ORDER BY date, user_id
`).all();

console.log('Backup database - Attendance records (Jan 23-26):');
console.log('Total records:', backupRecords.length);
if (backupRecords.length > 0) {
  console.log('\nSample records:');
  backupRecords.slice(0, 10).forEach((r, i) => {
    console.log(`  ${i + 1}. Date: ${r.date}, User: ${r.user_id}, Check-in: ${r.check_in_time || 'N/A'}, Check-out: ${r.check_out_time || 'N/A'}`);
  });
  
  // Group by date
  const byDate = {};
  backupRecords.forEach(r => {
    if (!byDate[r.date]) byDate[r.date] = 0;
    byDate[r.date]++;
  });
  console.log('\nRecords by date:');
  Object.keys(byDate).sort().forEach(date => {
    console.log(`  ${date}: ${byDate[date]} records`);
  });
}

console.log('\n2. Checking current database...\n');

// Check attendance records in current database for Jan 23-26
const currentRecords = currentDb.prepare(`
  SELECT date, user_id, check_in_time, check_out_time 
  FROM attendance 
  WHERE date BETWEEN '2026-01-23' AND '2026-01-26'
  ORDER BY date, user_id
`).all();

console.log('Current database - Attendance records (Jan 23-26):');
console.log('Total records:', currentRecords.length);
if (currentRecords.length > 0) {
  console.log('\nSample records:');
  currentRecords.slice(0, 10).forEach((r, i) => {
    console.log(`  ${i + 1}. Date: ${r.date}, User: ${r.user_id}, Check-in: ${r.check_in_time || 'N/A'}, Check-out: ${r.check_out_time || 'N/A'}`);
  });
  
  // Group by date
  const byDate = {};
  currentRecords.forEach(r => {
    if (!byDate[r.date]) byDate[r.date] = 0;
    byDate[r.date]++;
  });
  console.log('\nRecords by date:');
  Object.keys(byDate).sort().forEach(date => {
    console.log(`  ${date}: ${byDate[date]} records`);
  });
}

console.log('\n3. Comparison...\n');

const diff = backupRecords.length - currentRecords.length;
if (diff > 0) {
  console.log(`[WARNING] Current database is MISSING ${diff} records!`);
  console.log('Backup has:', backupRecords.length, 'records');
  console.log('Current has:', currentRecords.length, 'records');
} else if (diff < 0) {
  console.log(`[INFO] Current database has ${Math.abs(diff)} MORE records than backup`);
  console.log('Backup has:', backupRecords.length, 'records');
  console.log('Current has:', currentRecords.length, 'records');
} else {
  console.log('[OK] Both databases have the same number of records:', backupRecords.length);
}

// Find missing records
if (diff > 0) {
  console.log('\n4. Finding missing records...\n');
  const currentSet = new Set(currentRecords.map(r => `${r.date}|${r.user_id}`));
  const missing = backupRecords.filter(r => !currentSet.has(`${r.date}|${r.user_id}`));
  
  console.log('Missing records:', missing.length);
  if (missing.length > 0) {
    console.log('\nMissing records details:');
    missing.forEach((r, i) => {
      console.log(`  ${i + 1}. Date: ${r.date}, User: ${r.user_id}, Check-in: ${r.check_in_time || 'N/A'}, Check-out: ${r.check_out_time || 'N/A'}`);
    });
  }
}

backupDb.close();
currentDb.close();

console.log('\n=== Comparison Complete ===');
