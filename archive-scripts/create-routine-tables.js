const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Creating routine tables...');

try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS routine_templates (
            id TEXT PRIMARY KEY,
            department_id TEXT NOT NULL,
            title TEXT NOT NULL,
            items TEXT NOT NULL,
            last_updated TEXT NOT NULL,
            is_daily INTEGER DEFAULT 0,
            read_by TEXT DEFAULT '[]'
        )
    `);
    console.log('✅ routine_templates created');
    
    db.exec(`
        CREATE TABLE IF NOT EXISTS routine_records (
            id TEXT PRIMARY KEY,
            template_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            department_id TEXT NOT NULL,
            date TEXT NOT NULL,
            completed_items TEXT DEFAULT '[]',
            created_at TEXT NOT NULL
        )
    `);
    console.log('✅ routine_records created');
    
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'routine%'").all();
    console.log('Routine tables:', tables.map(t => t.name).join(', '));
    
    console.log('✅ Done!');
} catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
}

db.close();
