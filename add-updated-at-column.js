const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Adding updated_at column to memos table...');

try {
    // 檢查欄位是否已存在
    const tableInfo = db.prepare("PRAGMA table_info(memos)").all();
    const hasUpdatedAt = tableInfo.some(col => col.name === 'updated_at');
    
    if (hasUpdatedAt) {
        console.log('Column updated_at already exists');
    } else {
        db.exec('ALTER TABLE memos ADD COLUMN updated_at TEXT');
        console.log('SUCCESS: updated_at column added');
    }
    
    // 驗證
    const newTableInfo = db.prepare("PRAGMA table_info(memos)").all();
    console.log('Current columns:', newTableInfo.map(c => c.name).join(', '));
} catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
}

db.close();
