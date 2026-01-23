const Database = require('better-sqlite3');

const dbPath = '/app/data/taskflow.db';
const db = new Database(dbPath);

try {
  console.log('Checking attendance_records table columns...');
  
  const tableInfo = db.prepare("PRAGMA table_info(attendance_records)").all();
  console.log('Current columns:', tableInfo.map(c => c.name).join(', '));
  
  const columnsToAdd = [
    { name: 'is_manual', type: 'INTEGER DEFAULT 0' },
    { name: 'manual_reason', type: 'TEXT' },
    { name: 'manual_by', type: 'TEXT' }
  ];
  
  for (const col of columnsToAdd) {
    const exists = tableInfo.some(c => c.name === col.name);
    if (exists) {
      console.log(`INFO: ${col.name} column already exists`);
    } else {
      console.log(`Adding ${col.name} column...`);
      db.prepare(`ALTER TABLE attendance_records ADD COLUMN ${col.name} ${col.type}`).run();
      console.log(`SUCCESS: Added ${col.name} column`);
    }
  }
  
  // 驗證
  const updatedInfo = db.prepare("PRAGMA table_info(attendance_records)").all();
  console.log('Updated columns:', updatedInfo.map(c => c.name).join(', '));
  
  db.close();
  console.log('Database updated successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  db.close();
  process.exit(1);
}
