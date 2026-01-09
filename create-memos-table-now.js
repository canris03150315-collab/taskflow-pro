const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Creating memos table...');

const createTableSQL = `
CREATE TABLE IF NOT EXISTS memos (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('TEXT', 'CHECKLIST')),
    content TEXT,
    todos TEXT,
    color TEXT NOT NULL DEFAULT 'yellow',
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
)`;

try {
    db.exec(createTableSQL);
    console.log('SUCCESS: memos table created');
    
    // 驗證表是否存在
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='memos'").all();
    console.log('Verification:', tables.length > 0 ? 'Table exists' : 'Table not found');
} catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
}

db.close();
