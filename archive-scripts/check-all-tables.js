const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

// List all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();

console.log('All tables in database:');
tables.forEach(t => {
  const count = db.prepare('SELECT COUNT(*) as count FROM ' + t.name).get();
  console.log('  - ' + t.name + ' (' + count.count + ' records)');
});

// Check if there's a kols table
const kolsTable = tables.find(t => t.name === 'kols');
if (kolsTable) {
  console.log('\nkols table structure:');
  const kolsInfo = db.prepare("PRAGMA table_info(kols)").all();
  kolsInfo.forEach(col => {
    console.log('  - ' + col.name + ' (' + col.type + ')');
  });
}

db.close();
