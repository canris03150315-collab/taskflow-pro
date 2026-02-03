const Database = require('better-sqlite3');

console.log('=== Work Logs Comparison (Jan 22-26, 2026) ===\n');

// Open backup database (Jan 26, 18:00)
const backupDb = new Database('/app/backup_20260126.db', { readonly: true });

// Open current database
const currentDb = new Database('/app/data/taskflow.db', { readonly: true });

console.log('Step 1: Checking backup database (Jan 26, 18:00)...\n');

// Check work_logs in backup for Jan 22-26
const backupLogs = backupDb.prepare(`
  SELECT id, user_id, department_id, date, today_tasks, tomorrow_tasks, notes, created_at
  FROM work_logs 
  WHERE date BETWEEN '2026-01-22' AND '2026-01-26'
  ORDER BY date, user_id
`).all();

console.log('Backup database - Work logs (Jan 22-26):');
console.log('Total records:', backupLogs.length);

if (backupLogs.length > 0) {
  // Group by date
  const byDate = {};
  backupLogs.forEach(r => {
    if (!byDate[r.date]) byDate[r.date] = [];
    byDate[r.date].push(r);
  });
  
  console.log('\nRecords by date:');
  Object.keys(byDate).sort().forEach(date => {
    console.log(`  ${date}: ${byDate[date].length} records`);
  });
  
  console.log('\nSample records (first 5):');
  backupLogs.slice(0, 5).forEach((r, i) => {
    const tasksPreview = r.today_tasks ? r.today_tasks.substring(0, 40) + '...' : 'N/A';
    console.log(`  ${i + 1}. Date: ${r.date}, User: ${r.user_id}, Tasks: ${tasksPreview}`);
  });
}

console.log('\nStep 2: Checking current database...\n');

// Check work_logs in current database for Jan 22-26
const currentLogs = currentDb.prepare(`
  SELECT id, user_id, department_id, date, today_tasks, tomorrow_tasks, notes, created_at
  FROM work_logs 
  WHERE date BETWEEN '2026-01-22' AND '2026-01-26'
  ORDER BY date, user_id
`).all();

console.log('Current database - Work logs (Jan 22-26):');
console.log('Total records:', currentLogs.length);

if (currentLogs.length > 0) {
  // Group by date
  const byDate = {};
  currentLogs.forEach(r => {
    if (!byDate[r.date]) byDate[r.date] = [];
    byDate[r.date].push(r);
  });
  
  console.log('\nRecords by date:');
  Object.keys(byDate).sort().forEach(date => {
    console.log(`  ${date}: ${byDate[date].length} records`);
  });
  
  console.log('\nSample records (first 5):');
  currentLogs.slice(0, 5).forEach((r, i) => {
    const tasksPreview = r.today_tasks ? r.today_tasks.substring(0, 40) + '...' : 'N/A';
    console.log(`  ${i + 1}. Date: ${r.date}, User: ${r.user_id}, Tasks: ${tasksPreview}`);
  });
}

console.log('\nStep 3: Comparison Result...\n');

const diff = backupLogs.length - currentLogs.length;

if (diff > 0) {
  console.log(`[WARNING] Current database is MISSING ${diff} work log records!`);
  console.log('Backup has:', backupLogs.length, 'records');
  console.log('Current has:', currentLogs.length, 'records');
  console.log('\n=> DATA LOSS DETECTED!');
} else if (diff < 0) {
  console.log(`[INFO] Current database has ${Math.abs(diff)} MORE records than backup`);
  console.log('Backup has:', backupLogs.length, 'records');
  console.log('Current has:', currentLogs.length, 'records');
  console.log('\n=> New records added after backup');
} else {
  console.log('[OK] Both databases have the same number of records:', backupLogs.length);
}

// Find missing records if any
if (diff > 0) {
  console.log('\nStep 4: Detailed Missing Records Analysis...\n');
  
  const currentIds = new Set(currentLogs.map(r => r.id));
  const missing = backupLogs.filter(r => !currentIds.has(r.id));
  
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
        const todayPreview = r.today_tasks ? r.today_tasks.substring(0, 60) : 'N/A';
        const tomorrowPreview = r.tomorrow_tasks ? r.tomorrow_tasks.substring(0, 60) : 'N/A';
        console.log(`    ${i + 1}. ID: ${r.id}`);
        console.log(`       User: ${r.user_id}, Dept: ${r.department_id}`);
        console.log(`       Today tasks: ${todayPreview}`);
        console.log(`       Tomorrow tasks: ${tomorrowPreview}`);
        console.log(`       Created: ${r.created_at}`);
      });
    });
  }
}

// Check overall statistics
console.log('\nStep 5: Overall Statistics...\n');

const backupTotal = backupDb.prepare('SELECT COUNT(*) as count FROM work_logs').get();
const currentTotal = currentDb.prepare('SELECT COUNT(*) as count FROM work_logs').get();

console.log('Total work log records (all dates):');
console.log('  Backup:', backupTotal.count);
console.log('  Current:', currentTotal.count);
console.log('  Difference:', backupTotal.count - currentTotal.count);

const backupRange = backupDb.prepare('SELECT MIN(date) as min_date, MAX(date) as max_date FROM work_logs').get();
const currentRange = currentDb.prepare('SELECT MIN(date) as min_date, MAX(date) as max_date FROM work_logs').get();

console.log('\nDate range:');
console.log('  Backup:', backupRange.min_date, 'to', backupRange.max_date);
console.log('  Current:', currentRange.min_date, 'to', currentRange.max_date);

backupDb.close();
currentDb.close();

console.log('\n=== Comparison Complete ===');
