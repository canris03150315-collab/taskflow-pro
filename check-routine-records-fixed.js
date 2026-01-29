const Database = require('better-sqlite3');

console.log('=== Checking Routine Records ===\n');

const db = new Database('/app/data/taskflow.db', { readonly: true });

// Check routine_records table structure first
console.log('Step 1: Checking table structure...');
const tableInfo = db.prepare("PRAGMA table_info(routine_records)").all();
console.log('Columns:', tableInfo.map(c => c.name).join(', '));
console.log('');

// Check routine_records table
console.log('Step 2: Checking routine_records data...');

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
console.log('Step 3: Checking today\'s records (' + today + ')...');

const todayRecords = db.prepare(`
  SELECT *
  FROM routine_records
  WHERE date = ?
`).all(today);

console.log('Today\'s records:', todayRecords.length);
if (todayRecords.length > 0) {
  todayRecords.forEach(r => {
    console.log('  User:', r.user_id);
  });
} else {
  console.log('  [WARNING] No records for today!');
}
console.log('');

// Check recent dates
console.log('Step 4: Checking recent dates...');

const recentRecords = db.prepare(`
  SELECT date, COUNT(*) as count
  FROM routine_records
  GROUP BY date
  ORDER BY date DESC
  LIMIT 15
`).all();

console.log('Recent records by date:');
recentRecords.forEach(r => {
  console.log('  ' + r.date + ': ' + r.count + ' records');
});
console.log('');

// Check if there are any records after 2026-01-26
console.log('Step 5: Checking records after 2026-01-26...');

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
  console.log('This indicates data was rolled back to Jan 26 backup.');
}
console.log('');

// Check users table
console.log('Step 6: Checking active users...');

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
  console.log('Current date is ' + today);
  console.log('Missing ' + Math.floor((new Date(today) - new Date(stats.latest_date)) / (1000 * 60 * 60 * 24)) + ' days of data');
  console.log('');
  console.log('ROOT CAUSE: Database was restored from Jan 26 backup');
  console.log('');
  console.log('Impact:');
  console.log('- Jan 27, 28, 29 routine records are missing');
  console.log('- Users cannot see their daily task history');
  console.log('- Work overview shows no data for recent days');
  console.log('');
  console.log('Solution: Routine records cannot be recovered');
  console.log('Users need to re-submit their daily tasks for today');
} else {
  console.log('[OK] Routine records are up to date');
}
