const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Checking routines database...');

try {
    // 檢查表是否存在
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'routine%'").all();
    console.log('Routine tables:', tables.map(t => t.name).join(', '));
    
    if (tables.length === 0) {
        console.log('\n❌ No routine tables found! Need to create them.');
    } else {
        // 檢查表結構
        tables.forEach(table => {
            const info = db.prepare(`PRAGMA table_info(${table.name})`).all();
            console.log(`\n=== ${table.name} ===`);
            console.log('Columns:', info.map(c => `${c.name} (${c.type})`).join(', '));
            
            const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
            console.log('Row count:', count.count);
        });
    }
    
} catch (error) {
    console.error('ERROR:', error.message);
}

db.close();
