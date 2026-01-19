const Database = require('better-sqlite3');
const path = require('path');

console.log('Creating ai_conversations table...');

const dbPath = path.join('/app/data', 'taskflow.db');
const db = new Database(dbPath);

try {
  // Create ai_conversations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      message TEXT NOT NULL,
      intent TEXT,
      action_taken TEXT,
      action_result TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  console.log('SUCCESS: ai_conversations table created');
  
  // Create index for faster queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at);
  `);
  
  console.log('SUCCESS: Indexes created');
  
  // Verify table structure
  const tableInfo = db.prepare("PRAGMA table_info(ai_conversations)").all();
  console.log('Table structure:');
  tableInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
} finally {
  db.close();
}
