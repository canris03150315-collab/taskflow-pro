const Database = require('better-sqlite3');

const dbPath = '/app/data/taskflow.db';
const db = new Database(dbPath);

try {
  console.log('Checking attendance_records table for all manual-related columns...');
  
  const tableInfo = db.prepare("PRAGMA table_info(attendance_records)").all();
  console.log('Current columns:', tableInfo.map(c => c.name).join(', '));
  
  // 所有補登相關的欄位
  const columnsToAdd = [
    { name: 'is_manual', type: 'INTEGER DEFAULT 0' },
    { name: 'manual_reason', type: 'TEXT' },
    { name: 'manual_by', type: 'TEXT' },
    { name: 'manual_at', type: 'TEXT' }
  ];
  
  let addedCount = 0;
  for (const col of columnsToAdd) {
    const exists = tableInfo.some(c => c.name === col.name);
    if (exists) {
      console.log(`✓ ${col.name} already exists`);
    } else {
      console.log(`+ Adding ${col.name}...`);
      db.prepare(`ALTER TABLE attendance_records ADD COLUMN ${col.name} ${col.type}`).run();
      console.log(`✓ Added ${col.name}`);
      addedCount++;
    }
  }
  
  // 驗證
  const updatedInfo = db.prepare("PRAGMA table_info(attendance_records)").all();
  console.log('\nFinal columns:', updatedInfo.map(c => c.name).join(', '));
  console.log(`\nSummary: Added ${addedCount} new column(s)`);
  
  db.close();
  console.log('SUCCESS: Database updated successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  db.close();
  process.exit(1);
}
