const sqlite3 = require('better-sqlite3');

const dbPath = '/app/data/taskflow.db';
const db = sqlite3(dbPath);

console.log('Creating work_logs table...');

try {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS work_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      today_tasks TEXT NOT NULL,
      tomorrow_tasks TEXT NOT NULL,
      special_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, date)
    )
  `).run();
  
  console.log('SUCCESS: work_logs table created');
  
  // Check table structure
  const tableInfo = db.prepare("PRAGMA table_info(work_logs)").all();
  console.log('\nTable structure:');
  tableInfo.forEach(col => {
    console.log(`  ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
  });
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
} finally {
  db.close();
}
