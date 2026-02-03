const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

const info = db.prepare('PRAGMA table_info(memos)').all();
console.log('memos table structure:');
info.forEach(c => {
  console.log('  - ' + c.name + ' (' + c.type + ')');
});

const sample = db.prepare('SELECT * FROM memos LIMIT 1').get();
if (sample) {
  console.log('\nSample record:');
  Object.keys(sample).forEach(key => {
    console.log('  - ' + key);
  });
}

db.close();
