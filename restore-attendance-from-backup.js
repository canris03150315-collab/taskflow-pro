const Database = require('better-sqlite3');

console.log('=== Restore Missing Attendance Records ===\n');

// Open backup database (Jan 26, 18:00)
const backupDb = new Database('/app/backup_20260126.db', { readonly: true });

// Open current database (read-write)
const currentDb = new Database('/app/data/taskflow.db');

console.log('Step 1: Finding missing records...\n');

// Get all records from backup for Jan 23-26
const backupRecords = backupDb.prepare(`
  SELECT * FROM attendance_records 
  WHERE date BETWEEN '2026-01-23' AND '2026-01-26'
  ORDER BY date, user_id
`).all();

console.log('Backup records (Jan 23-26):', backupRecords.length);

// Get all records from current database for Jan 23-26
const currentRecords = currentDb.prepare(`
  SELECT id FROM attendance_records 
  WHERE date BETWEEN '2026-01-23' AND '2026-01-26'
`).all();

console.log('Current records (Jan 23-26):', currentRecords.length);

// Find missing records
const currentIds = new Set(currentRecords.map(r => r.id));
const missingRecords = backupRecords.filter(r => !currentIds.has(r.id));

console.log('Missing records:', missingRecords.length);

if (missingRecords.length === 0) {
  console.log('\n[INFO] No missing records to restore!');
  backupDb.close();
  currentDb.close();
  process.exit(0);
}

console.log('\nStep 2: Preparing to restore missing records...\n');

// Prepare insert statement
const insertStmt = currentDb.prepare(`
  INSERT INTO attendance_records (
    id, user_id, date, clock_in, clock_out, duration_minutes,
    status, location_lat, location_lng, location_address,
    is_offline, created_at, type, clock_in_time, clock_out_time,
    work_hours, is_manual, manual_reason, manual_by, manual_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?
  )
`);

console.log('Step 3: Restoring records...\n');

let successCount = 0;
let errorCount = 0;

// Begin transaction for better performance
currentDb.prepare('BEGIN').run();

try {
  missingRecords.forEach((record, index) => {
    try {
      insertStmt.run(
        record.id,
        record.user_id,
        record.date,
        record.clock_in,
        record.clock_out,
        record.duration_minutes,
        record.status,
        record.location_lat,
        record.location_lng,
        record.location_address,
        record.is_offline,
        record.created_at,
        record.type,
        record.clock_in_time,
        record.clock_out_time,
        record.work_hours,
        record.is_manual,
        record.manual_reason,
        record.manual_by,
        record.manual_at
      );
      successCount++;
      
      if ((index + 1) % 5 === 0 || index === missingRecords.length - 1) {
        console.log(`  Restored ${index + 1}/${missingRecords.length} records...`);
      }
    } catch (error) {
      errorCount++;
      console.log(`  [ERROR] Failed to restore record ${record.id}:`, error.message);
    }
  });
  
  // Commit transaction
  currentDb.prepare('COMMIT').run();
  console.log('\n[SUCCESS] Transaction committed!');
  
} catch (error) {
  // Rollback on error
  currentDb.prepare('ROLLBACK').run();
  console.log('\n[ERROR] Transaction rolled back:', error.message);
  backupDb.close();
  currentDb.close();
  process.exit(1);
}

console.log('\nStep 4: Verification...\n');

// Verify restored records
const verifyRecords = currentDb.prepare(`
  SELECT date, COUNT(*) as count 
  FROM attendance_records 
  WHERE date BETWEEN '2026-01-23' AND '2026-01-26'
  GROUP BY date
  ORDER BY date
`).all();

console.log('Records by date after restoration:');
verifyRecords.forEach(r => {
  console.log(`  ${r.date}: ${r.count} records`);
});

const totalAfter = currentDb.prepare(`
  SELECT COUNT(*) as count 
  FROM attendance_records 
  WHERE date BETWEEN '2026-01-23' AND '2026-01-26'
`).get();

console.log('\nTotal records (Jan 23-26):', totalAfter.count);
console.log('Expected:', backupRecords.length);

if (totalAfter.count === backupRecords.length) {
  console.log('\n[SUCCESS] All records restored successfully!');
} else {
  console.log('\n[WARNING] Record count mismatch!');
}

console.log('\nSummary:');
console.log('  Successfully restored:', successCount, 'records');
console.log('  Failed:', errorCount, 'records');

backupDb.close();
currentDb.close();

console.log('\n=== Restoration Complete ===');
