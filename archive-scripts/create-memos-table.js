const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

const sql = `CREATE TABLE IF NOT EXISTS memos (
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
console.log('SUCCESS: memos table created');
db.close();
