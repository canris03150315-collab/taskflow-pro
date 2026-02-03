const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Checking routine_records schema ===\n');

const schema = db.prepare('PRAGMA table_info(routine_records)').all();
console.log('routine_records columns:');
schema.forEach(col => {
  console.log(`  ${col.name} (${col.type})`);
});

// Show a sample record
const sample = db.prepare('SELECT * FROM routine_records LIMIT 1').get();
console.log('\nSample record:');
console.log(JSON.stringify(sample, null, 2));

db.close();
