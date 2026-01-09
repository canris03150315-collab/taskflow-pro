const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Adding manual attendance columns to attendance_records table...');

try {
  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(attendance_records)").all();
  const columnNames = tableInfo.map(col => col.name);
  
  console.log('Existing columns:', columnNames);
  
  // Add is_manual column
  if (!columnNames.includes('is_manual')) {
    db.exec('ALTER TABLE attendance_records ADD COLUMN is_manual INTEGER DEFAULT 0');
    console.log('Added is_manual column');
  } else {
    console.log('is_manual column already exists');
  }
  
  // Add manual_by column
  if (!columnNames.includes('manual_by')) {
    db.exec('ALTER TABLE attendance_records ADD COLUMN manual_by TEXT');
    console.log('Added manual_by column');
  } else {
    console.log('manual_by column already exists');
  }
  
  // Add manual_reason column
  if (!columnNames.includes('manual_reason')) {
    db.exec('ALTER TABLE attendance_records ADD COLUMN manual_reason TEXT');
    console.log('Added manual_reason column');
  } else {
    console.log('manual_reason column already exists');
  }
  
  // Add manual_at column
  if (!columnNames.includes('manual_at')) {
    db.exec('ALTER TABLE attendance_records ADD COLUMN manual_at TEXT');
    console.log('Added manual_at column');
  } else {
    console.log('manual_at column already exists');
  }
  
  console.log('SUCCESS: All manual attendance columns added');
  
} catch (error) {
  console.error('Error adding columns:', error);
  process.exit(1);
}

db.close();
