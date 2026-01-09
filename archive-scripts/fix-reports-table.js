const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Creating reports table...');

const sql = "CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, type TEXT NOT NULL DEFAULT 'DAILY', user_id TEXT NOT NULL, created_at TEXT NOT NULL, content TEXT NOT NULL)";

try {
    db.exec(sql);
    console.log('SUCCESS: reports table created');
    
    // Verify table exists
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reports'").all();
    console.log('Verification:', tables.length > 0 ? 'reports table exists' : 'ERROR: table not found');
} catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
}

db.close();
