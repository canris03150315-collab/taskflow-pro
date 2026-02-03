const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== KOL Profiles Table Structure ===');
const tableInfo = db.prepare('PRAGMA table_info(kol_profiles)').all();
tableInfo.forEach(col => {
  console.log(`  ${col.name} (${col.type})`);
});

console.log('\n=== Sample KOL Record ===');
const sample = db.prepare('SELECT * FROM kol_profiles LIMIT 1').get();
if (sample) {
  console.log(JSON.stringify(sample, null, 2));
}

db.close();
