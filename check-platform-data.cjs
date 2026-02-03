const Database = require('better-sqlite3');

console.log('=== Checking Platform Revenue Data ===\n');

const db = new Database('/app/data/taskflow.db');

console.log('Step 1: Check if platform_transactions table exists\n');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='platform_transactions'").all();
console.log('Tables found:', tables);

if (tables.length === 0) {
  console.log('\n❌ ERROR: platform_transactions table does not exist!');
  db.close();
  process.exit(1);
}

console.log('\nStep 2: Count total records\n');
const count = db.prepare('SELECT COUNT(*) as count FROM platform_transactions').get();
console.log('Total records:', count.count);

if (count.count === 0) {
  console.log('\n❌ No data in platform_transactions table');
  db.close();
  process.exit(0);
}

console.log('\nStep 3: Show sample records (first 5)\n');
const samples = db.prepare('SELECT * FROM platform_transactions LIMIT 5').all();
samples.forEach((record, idx) => {
  console.log(`Record ${idx + 1}:`);
  console.log('  Platform:', record.platform_name);
  console.log('  Date:', record.date);
  console.log('  Lottery Amount:', record.lottery_amount);
  console.log('  Profit:', record.profit);
  console.log('  Balance:', record.balance);
  console.log('');
});

console.log('Step 4: Check distinct platforms\n');
const platforms = db.prepare('SELECT DISTINCT platform_name FROM platform_transactions ORDER BY platform_name').all();
console.log('Platforms found:', platforms.length);
platforms.forEach(p => console.log('  -', p.platform_name));

console.log('\nStep 5: Check date range\n');
const dateRange = db.prepare('SELECT MIN(date) as min_date, MAX(date) as max_date FROM platform_transactions').get();
console.log('Date range:', dateRange.min_date, 'to', dateRange.max_date);

console.log('\n=== Diagnosis Complete ===');
db.close();
