const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

// Check routine_records table structure
const tableInfo = db.prepare("PRAGMA table_info(routine_records)").all();

console.log('routine_records table structure:');
tableInfo.forEach(col => {
  console.log('  - ' + col.name + ' (' + col.type + ')');
});

// Check a sample record
const sample = db.prepare('SELECT * FROM routine_records LIMIT 1').get();
if (sample) {
  console.log('\nSample record columns:');
  Object.keys(sample).forEach(key => {
    console.log('  - ' + key + ': ' + sample[key]);
  });
}

db.close();
