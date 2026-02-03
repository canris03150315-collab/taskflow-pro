const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Verifying Platform Revenue Tables ===\n');

try {
  // 查詢所有表
  const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('All tables in database:');
  allTables.forEach(t => console.log('  - ' + t.name));
  console.log('');
  
  // 查詢 platform 相關表
  const platformTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%platform%' OR name LIKE '%transaction%')").all();
  
  if (platformTables.length > 0) {
    console.log('Platform revenue tables found:');
    platformTables.forEach(table => {
      console.log('\nTable: ' + table.name);
      const info = db.prepare('PRAGMA table_info(' + table.name + ')').all();
      console.log('Columns (' + info.length + '):');
      info.forEach(col => {
        console.log('  - ' + col.name + ' (' + col.type + ')');
      });
      
      const count = db.prepare('SELECT COUNT(*) as count FROM ' + table.name).get();
      console.log('Records: ' + count.count);
    });
    console.log('\nSUCCESS: Platform revenue tables exist!');
  } else {
    console.log('ERROR: No platform revenue tables found');
  }
  
} catch (error) {
  console.error('ERROR:', error.message);
} finally {
  db.close();
}
