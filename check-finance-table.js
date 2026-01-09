const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Checking finance table ===\n');

try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='finance'").all();
  console.log('Finance table exists:', tables.length > 0);
  
  if (tables.length === 0) {
    console.log('\n=== Creating finance table ===');
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS finance (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        user_id TEXT NOT NULL,
        department_id TEXT,
        date TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        confirmed_by TEXT,
        confirmed_at TEXT,
        created_at TEXT NOT NULL
      )
    `);
    
    console.log('Finance table created successfully!');
    
    const verify = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='finance'").all();
    console.log('Verification - Finance table exists:', verify.length > 0);
  } else {
    console.log('\n=== Finance table schema ===');
    const schema = db.prepare("PRAGMA table_info(finance)").all();
    console.log(JSON.stringify(schema, null, 2));
  }
} catch (error) {
  console.error('Error:', error);
}

db.close();
