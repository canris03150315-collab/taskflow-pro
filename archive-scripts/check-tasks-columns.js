const Database = require('better-sqlite3');

const dbPath = '/app/data/taskflow.db';
const db = new Database(dbPath);

console.log('=== Tasks table structure ===\n');

try {
  const tableInfo = db.prepare('PRAGMA table_info(tasks)').all();
  
  console.log('Columns in tasks table:');
  tableInfo.forEach(col => {
    console.log(`- ${col.name} (${col.type})`);
  });
  
} catch (error) {
  console.error('Error:', error.message);
}

db.close();
