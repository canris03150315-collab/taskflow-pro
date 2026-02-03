const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== kol_contracts table structure ===');
const info = db.prepare('PRAGMA table_info(kol_contracts)').all();
console.log(JSON.stringify(info, null, 2));

console.log('\n=== Sample contract data ===');
const sample = db.prepare('SELECT * FROM kol_contracts LIMIT 1').get();
if (sample) {
  console.log(JSON.stringify(sample, null, 2));
} else {
  console.log('No contracts found');
}

db.close();
