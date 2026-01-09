const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Adding status change tracking fields ===\n');

try {
  // 檢查當前表結構
  console.log('Current schema:');
  const schema = db.prepare("PRAGMA table_info(suggestions)").all();
  schema.forEach(col => {
    console.log(`  ${col.name}: ${col.type}`);
  });
  
  // 檢查是否已有這些欄位
  const hasStatusChangedBy = schema.find(col => col.name === 'status_changed_by');
  const hasStatusChangedAt = schema.find(col => col.name === 'status_changed_at');
  
  if (!hasStatusChangedBy) {
    console.log('\n添加 status_changed_by 欄位...');
    db.exec('ALTER TABLE suggestions ADD COLUMN status_changed_by TEXT');
    console.log('✅ status_changed_by 欄位已添加');
  } else {
    console.log('\n✓ status_changed_by 欄位已存在');
  }
  
  if (!hasStatusChangedAt) {
    console.log('添加 status_changed_at 欄位...');
    db.exec('ALTER TABLE suggestions ADD COLUMN status_changed_at TEXT');
    console.log('✅ status_changed_at 欄位已添加');
  } else {
    console.log('✓ status_changed_at 欄位已存在');
  }
  
  // 驗證新表結構
  console.log('\n=== Updated schema ===');
  const newSchema = db.prepare("PRAGMA table_info(suggestions)").all();
  newSchema.forEach(col => {
    console.log(`  ${col.name}: ${col.type}`);
  });
  
} catch (error) {
  console.error('Error:', error);
}

db.close();
