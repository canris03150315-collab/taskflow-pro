const sqlite3 = require('better-sqlite3');

const dbPath = '/app/data/taskflow.db';
const db = sqlite3(dbPath);

console.log('Adding work log columns to reports table...');

try {
  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(reports)").all();
  const columnNames = tableInfo.map(col => col.name);
  
  if (!columnNames.includes('today_tasks')) {
    db.prepare('ALTER TABLE reports ADD COLUMN today_tasks TEXT').run();
    console.log('Added today_tasks column');
  } else {
    console.log('today_tasks column already exists');
  }
  
  if (!columnNames.includes('tomorrow_tasks')) {
    db.prepare('ALTER TABLE reports ADD COLUMN tomorrow_tasks TEXT').run();
    console.log('Added tomorrow_tasks column');
  } else {
    console.log('tomorrow_tasks column already exists');
  }
  
  if (!columnNames.includes('special_notes')) {
    db.prepare('ALTER TABLE reports ADD COLUMN special_notes TEXT').run();
    console.log('Added special_notes column');
  } else {
    console.log('special_notes column already exists');
  }
  
  console.log('SUCCESS: Work log columns added to reports table');
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
} finally {
  db.close();
}
