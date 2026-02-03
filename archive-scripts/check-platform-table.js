const Database = require('better-sqlite3');

console.log('=== Checking platform_transactions Table ===\n');

const db = new Database('/app/data/taskflow.db');

console.log('Step 1: Checking if table exists...\n');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='platform_transactions'").all();

if (tables.length === 0) {
  console.log('❌ ERROR: platform_transactions table does NOT exist!');
  console.log('\nThis is the root cause of the 500 error.');
  console.log('The /parse endpoint tries to query this table, but it does not exist.');
  
  console.log('\nStep 2: Checking all tables in database...\n');
  const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('Existing tables:');
  allTables.forEach(t => console.log(`  - ${t.name}`));
  
} else {
  console.log('✅ platform_transactions table exists');
  
  console.log('\nStep 2: Checking table structure...\n');
  const tableInfo = db.prepare("PRAGMA table_info(platform_transactions)").all();
  console.log('Table columns:');
  tableInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });
  
  console.log('\nStep 3: Checking record count...\n');
  const count = db.prepare('SELECT COUNT(*) as count FROM platform_transactions').get();
  console.log(`Total records: ${count.count}`);
}

db.close();

console.log('\n=== Check Complete ===');
