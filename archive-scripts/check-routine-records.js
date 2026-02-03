const Database = require('better-sqlite3');

console.log('=== Checking Routine Records ===\n');

const db = new Database('/app/data/taskflow.db', { readonly: true });

// Check routine_records table
console.log('Step 1: Checking routine_records table...');

const stats = db.prepare(`
  SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(date) as earliest_date,
    MAX(date) as latest_date
  FROM routine_records
`).get();

console.log('Routine Records:');
console.log('  Total records:', stats.total_records);
console.log('  Unique users:', stats.unique_users);
console.log('  Date range:', stats.earliest_date, 'to', stats.latest_date);
console.log('');

// Check today's records
const today = new Date().toISOString().split('T')[0];
console.log('Step 2: Checking today\'s records (' + today + ')...');

const todayRecords = db.prepare(`
  SELECT user_id, status, completed_at
  FROM routine_records
  WHERE date = ?
`).all(today);

console.log('Today\'s records:', todayRecords.length);
if (todayRecords.length > 0) {
  todayRecords.forEach(r => {
    console.log('  User:', r.user_id, '| Status:', r.status, '| Completed:', r.completed_at || 'N/A');
  });
} else {
  console.log('  [WARNING] No records for today!');
}
console.log('');

// Check recent dates
console.log('Step 3: Checking recent dates...');

const recentRecords = db.prepare(`
  SELECT date, COUNT(*) as count, GROUP_CONCAT(DISTINCT user_id) as users
  FROM routine_records
  GROUP BY date
  ORDER BY date DESC
  LIMIT 10
`).all();

console.log('Recent records by date:');
recentRecords.forEach(r => {
  const userCount = r.users ? r.users.split(',').length : 0;
  console.log('  ' + r.date + ': ' + r.count + ' records (' + userCount + ' users)');
});
console.log('');

// Check if there are any records after 2026-01-26
console.log('Step 4: Checking records after 2026-01-26...');

const afterJan26 = db.prepare(`
  SELECT date, COUNT(*) as count
  FROM routine_records
  WHERE date > '2026-01-26'
  GROUP BY date
  ORDER BY date
`).all();

if (afterJan26.length > 0) {
  console.log('Records after Jan 26:');
  afterJan26.forEach(r => {
    console.log('  ' + r.date + ': ' + r.count + ' records');
  });
} else {
  console.log('[CRITICAL] No records after 2026-01-26!');
  console.log('This indicates data was rolled back or lost.');
}
console.log('');

// Check users table to see how many users should have routines
console.log('Step 5: Checking active users...');

const activeUsers = db.prepare(`
  SELECT COUNT(*) as count
  FROM users
  WHERE role != 'BOSS'
`).get();

console.log('Active users (non-BOSS):', activeUsers.count);
console.log('Expected daily records:', activeUsers.count);
console.log('');

db.close();

console.log('=== Analysis Complete ===');
console.log('');

if (stats.latest_date < today) {
  console.log('[CRITICAL] Latest routine record is ' + stats.latest_date);
  console.log('This is BEFORE today (' + today + ')');
  console.log('');
  console.log('Possible causes:');
  console.log('1. Database was restored from an old backup');
  console.log('2. Routine records were not created today');
  console.log('3. Data was lost during a restore operation');
  console.log('');
  console.log('Recommendation: Check if database was restored recently');
} else {
  console.log('[OK] Routine records are up to date');
}
