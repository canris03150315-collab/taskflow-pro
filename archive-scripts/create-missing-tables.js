const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Creating missing tables...');

// Create memos table
try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS memos (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            type TEXT DEFAULT 'TEXT',
            content TEXT,
            todos TEXT,
            color TEXT DEFAULT '#fef3c7',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `);
    console.log('✅ memos table created');
} catch (error) {
    console.error('❌ memos table error:', error.message);
}

// Create reports table
try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL DEFAULT 'DAILY',
            user_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            content TEXT NOT NULL
        )
    `);
    console.log('✅ reports table created');
} catch (error) {
    console.error('❌ reports table error:', error.message);
}

// Create finance table
try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS finance (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT,
            user_id TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    `);
    console.log('✅ finance table created');
} catch (error) {
    console.error('❌ finance table error:', error.message);
}

// Create forum table
try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS forum (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            user_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `);
    console.log('✅ forum table created');
} catch (error) {
    console.error('❌ forum table error:', error.message);
}

// Verify tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('\nAll tables:');
tables.forEach(table => {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    console.log(`- ${table.name}: ${count.count} records`);
});

db.close();
console.log('\nSUCCESS: All missing tables created');
