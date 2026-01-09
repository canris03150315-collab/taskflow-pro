const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Creating report_edit_logs table...');

try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS report_edit_logs (
            id TEXT PRIMARY KEY,
            report_id TEXT NOT NULL,
            editor_id TEXT NOT NULL,
            editor_name TEXT NOT NULL,
            edited_at TEXT NOT NULL,
            old_content TEXT,
            new_content TEXT,
            reason TEXT
        )
    `);
    
    console.log('SUCCESS: report_edit_logs table created');
    
    // Verify table exists
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='report_edit_logs'").all();
    console.log('Verification:', tables.length > 0 ? 'Table exists' : 'Table not found');
    
} catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
}

db.close();
console.log('Done');
