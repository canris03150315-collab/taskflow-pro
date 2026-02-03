const Database = require('better-sqlite3');

console.log('Adding status_color column to kol_profiles...');

try {
  const db = new Database('/app/data/taskflow.db');
  
  const tableInfo = db.prepare("PRAGMA table_info(kol_profiles)").all();
  const hasStatusColor = tableInfo.some(col => col.name === 'status_color');
  
  if (!hasStatusColor) {
    db.prepare('ALTER TABLE kol_profiles ADD COLUMN status_color TEXT').run();
    console.log('SUCCESS: status_color column added');
  } else {
    console.log('INFO: status_color column already exists');
  }
  
  db.close();
  console.log('DONE');
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
