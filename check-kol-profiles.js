const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

const profileInfo = db.prepare("PRAGMA table_info(kol_profiles)").all();
console.log('kol_profiles table structure:');
profileInfo.forEach(col => {
  console.log('  - ' + col.name + ' (' + col.type + ')');
});

const sample = db.prepare('SELECT * FROM kol_profiles LIMIT 1').get();
if (sample) {
  console.log('\nSample kol_profiles record:');
  Object.keys(sample).forEach(key => {
    console.log('  - ' + key + ': ' + sample[key]);
  });
}

db.close();
