const Database = require('better-sqlite3');
const path = require('path');

const dbPath = '/app/data/taskflow.db';
const db = new Database(dbPath);

try {
  console.log('Checking if is_manual column exists...');
  
  // 檢查欄位是否已存在
  const tableInfo = db.prepare("PRAGMA table_info(attendance_records)").all();
  const hasIsManual = tableInfo.some(col => col.name === 'is_manual');
  
  if (hasIsManual) {
    console.log('INFO: is_manual column already exists');
  } else {
    console.log('Adding is_manual column...');
    db.prepare('ALTER TABLE attendance_records ADD COLUMN is_manual INTEGER DEFAULT 0').run();
    console.log('SUCCESS: Added is_manual column to attendance_records table');
  }
  
  // 檢查 manual_reason 欄位
  const hasManualReason = tableInfo.some(col => col.name === 'manual_reason');
  
  if (hasManualReason) {
    console.log('INFO: manual_reason column already exists');
  } else {
    console.log('Adding manual_reason column...');
    db.prepare('ALTER TABLE attendance_records ADD COLUMN manual_reason TEXT').run();
    console.log('SUCCESS: Added manual_reason column to attendance_records table');
  }
  
  db.close();
  console.log('Database updated successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
