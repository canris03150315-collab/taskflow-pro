const Database = require('better-sqlite3');

console.log('=== Restore Missing Work Logs ===\n');

// Open backup database (Jan 26, 18:00)
const backupDb = new Database('/app/backup_20260126.db', { readonly: true });

// Open current database (read-write)
const currentDb = new Database('/app/data/taskflow.db');

console.log('Step 1: Finding missing records...\n');

// Get all work logs from backup for Jan 22-26
const backupLogs = backupDb.prepare(`
  SELECT * FROM work_logs 
  WHERE date BETWEEN '2026-01-22' AND '2026-01-26'
  ORDER BY date, user_id
`).all();

console.log('Backup records (Jan 22-26):', backupLogs.length);

// Get all work logs from current database for Jan 22-26
const currentLogs = currentDb.prepare(`
  SELECT id FROM work_logs 
  WHERE date BETWEEN '2026-01-22' AND '2026-01-26'
`).all();

console.log('Current records (Jan 22-26):', currentLogs.length);

// Find missing records
const currentIds = new Set(currentLogs.map(r => r.id));
const missingLogs = backupLogs.filter(r => !currentIds.has(r.id));

console.log('Missing records:', missingLogs.length);

if (missingLogs.length === 0) {
  console.log('\n[INFO] No missing records to restore!');
  backupDb.close();
  currentDb.close();
  process.exit(0);
}

console.log('\nStep 2: Preparing to restore missing records...\n');

// Prepare insert statement
const insertStmt = currentDb.prepare(`
  INSERT INTO work_logs (
    id, user_id, department_id, date, today_tasks, tomorrow_tasks,
    notes, created_at, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?
  )
`);

console.log('Step 3: Restoring records...\n');

let successCount = 0;
let errorCount = 0;

// Begin transaction for better performance
currentDb.prepare('BEGIN').run();

try {
  missingLogs.forEach((record, index) => {
    try {
      insertStmt.run(
        record.id,
        record.user_id,
        record.department_id,
        record.date,
        record.today_tasks,
        record.tomorrow_tasks,
        record.notes,
        record.created_at,
        record.updated_at
      );
      successCount++;
      
      if ((index + 1) % 5 === 0 || index === missingLogs.length - 1) {
        console.log(`  Restored ${index + 1}/${missingLogs.length} records...`);
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
const verifyLogs = currentDb.prepare(`
  SELECT date, COUNT(*) as count 
  FROM work_logs 
  WHERE date BETWEEN '2026-01-22' AND '2026-01-26'
  GROUP BY date
  ORDER BY date
`).all();

console.log('Records by date after restoration:');
verifyLogs.forEach(r => {
  console.log(`  ${r.date}: ${r.count} records`);
});

const totalAfter = currentDb.prepare(`
  SELECT COUNT(*) as count 
  FROM work_logs 
  WHERE date BETWEEN '2026-01-22' AND '2026-01-26'
`).get();

console.log('\nTotal records (Jan 22-26):', totalAfter.count);
console.log('Expected:', backupLogs.length);

if (totalAfter.count === backupLogs.length) {
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
