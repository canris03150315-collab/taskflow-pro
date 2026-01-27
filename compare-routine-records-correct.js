const Database = require('better-sqlite3');

console.log('=== Routine Records Comparison (Jan 22-26, 2026) ===\n');

// Open backup database (Jan 26, 18:00)
const backupDb = new Database('/app/backup_20260126.db', { readonly: true });

// Open current database
const currentDb = new Database('/app/data/taskflow.db', { readonly: true });

console.log('Step 1: Checking backup database (Jan 26, 18:00)...\n');

// Check routine_records in backup for Jan 22-26
const backupRecords = backupDb.prepare(`
  SELECT id, template_id, user_id, department_id, date, completed_items, created_at
  FROM routine_records 
  WHERE date BETWEEN '2026-01-22' AND '2026-01-26'
  ORDER BY date, user_id
`).all();

console.log('Backup database - Routine records (Jan 22-26):');
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
    const itemsPreview = r.completed_items ? r.completed_items.substring(0, 40) : 'N/A';
    console.log(`  ${i + 1}. Date: ${r.date}, User: ${r.user_id}, Items: ${itemsPreview}`);
  });
}

console.log('\nStep 2: Checking current database...\n');

// Check routine_records in current database for Jan 22-26
const currentRecords = currentDb.prepare(`
  SELECT id, template_id, user_id, department_id, date, completed_items, created_at
  FROM routine_records 
  WHERE date BETWEEN '2026-01-22' AND '2026-01-26'
  ORDER BY date, user_id
`).all();

console.log('Current database - Routine records (Jan 22-26):');
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
    const itemsPreview = r.completed_items ? r.completed_items.substring(0, 40) : 'N/A';
    console.log(`  ${i + 1}. Date: ${r.date}, User: ${r.user_id}, Items: ${itemsPreview}`);
  });
}

console.log('\nStep 3: Comparison Result...\n');

const diff = backupRecords.length - currentRecords.length;

if (diff > 0) {
  console.log(`[WARNING] Current database is MISSING ${diff} routine records!`);
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
  console.log('\nStep 4: Detailed Missing Records Analysis...\n');
  
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
      missingByDate[date].slice(0, 10).forEach((r, i) => {
        const itemsPreview = r.completed_items ? r.completed_items.substring(0, 60) : 'N/A';
        console.log(`    ${i + 1}. User: ${r.user_id}, Dept: ${r.department_id}`);
        console.log(`       Template: ${r.template_id}`);
        console.log(`       Completed items: ${itemsPreview}`);
      });
      if (missingByDate[date].length > 10) {
        console.log(`    ... and ${missingByDate[date].length - 10} more records`);
      }
    });
  }
}

// Check overall statistics
console.log('\nStep 5: Overall Statistics...\n');

const backupTotal = backupDb.prepare('SELECT COUNT(*) as count FROM routine_records').get();
const currentTotal = currentDb.prepare('SELECT COUNT(*) as count FROM routine_records').get();

console.log('Total routine records (all dates):');
console.log('  Backup:', backupTotal.count);
console.log('  Current:', currentTotal.count);
console.log('  Difference:', backupTotal.count - currentTotal.count);

const backupRange = backupDb.prepare('SELECT MIN(date) as min_date, MAX(date) as max_date FROM routine_records').get();
const currentRange = currentDb.prepare('SELECT MIN(date) as min_date, MAX(date) as max_date FROM routine_records').get();

console.log('\nDate range:');
console.log('  Backup:', backupRange.min_date, 'to', backupRange.max_date);
console.log('  Current:', currentRange.min_date, 'to', currentRange.max_date);

backupDb.close();
currentDb.close();

console.log('\n=== Comparison Complete ===');
