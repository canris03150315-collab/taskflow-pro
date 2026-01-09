const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Creating routines tables...');

try {
    // 創建 routine_templates 表
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
    console.log('✅ Created routine_templates table');
    
    // 創建 routine_records 表
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
    console.log('✅ Created routine_records table');
    
    // 驗證
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'routine%'").all();
    console.log('\nRoutine tables:', tables.map(t => t.name).join(', '));
    
    console.log('\n✅ All tables created successfully!');
    
} catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
}

db.close();
