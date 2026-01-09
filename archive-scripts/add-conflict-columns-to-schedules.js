const Database = require('better-sqlite3');

console.log('Adding conflict columns to schedules table...\n');

try {
  const db = new Database('/app/data/taskflow.db');
  
  // Add has_conflict column
  try {
    db.exec('ALTER TABLE schedules ADD COLUMN has_conflict INTEGER DEFAULT 0');
    console.log('OK Added has_conflict column');
  } catch (e) {
    if (e.message.includes('duplicate column')) {
      console.log('INFO has_conflict column already exists');
    } else {
      throw e;
    }
  }
  
  // Add conflict_details column
  try {
    db.exec('ALTER TABLE schedules ADD COLUMN conflict_details TEXT');
    console.log('OK Added conflict_details column');
  } catch (e) {
    if (e.message.includes('duplicate column')) {
      console.log('INFO conflict_details column already exists');
    } else {
      throw e;
    }
  }
  
  db.close();
  console.log('\nOK All conflict columns added successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
