const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

// Check kol_contracts table structure
const tableInfo = db.prepare("PRAGMA table_info(kol_contracts)").all();

console.log('kol_contracts table structure:');
tableInfo.forEach(col => {
  console.log('  - ' + col.name + ' (' + col.type + ')');
});

// Check a sample record
const sample = db.prepare('SELECT * FROM kol_contracts LIMIT 1').get();
if (sample) {
  console.log('\nSample record columns:');
  Object.keys(sample).forEach(key => {
    console.log('  - ' + key);
  });
}

db.close();
