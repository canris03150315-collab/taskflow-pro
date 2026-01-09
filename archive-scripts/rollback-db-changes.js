const sqlite3 = require('better-sqlite3');

const dbPath = '/app/data/taskflow.db';
const db = sqlite3(dbPath);

console.log('Checking reports table structure...');

try {
  const tableInfo = db.prepare("PRAGMA table_info(reports)").all();
  console.log('Current columns:', tableInfo.map(col => col.name).join(', '));
  
  // SQLite does not support DROP COLUMN, so we note that the columns exist but are unused
  console.log('Note: SQLite does not support DROP COLUMN');
  console.log('The added columns (today_tasks, tomorrow_tasks, special_notes) will remain but unused');
  console.log('Backend uses JSON content field instead');
} catch (error) {
  console.error('ERROR:', error.message);
} finally {
  db.close();
}
