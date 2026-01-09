const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

// Drop the old table
db.exec('DROP TABLE IF EXISTS memos');

// Create the correct table with all columns
const sql = `CREATE TABLE memos (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT DEFAULT 'TEXT',
    content TEXT,
    todos TEXT,
    color TEXT DEFAULT '#fef3c7',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)`;

db.exec(sql);
console.log('SUCCESS: memos table recreated with updated_at column');
db.close();
