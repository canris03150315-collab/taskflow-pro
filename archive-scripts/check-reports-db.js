const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Checking reports table...');

try {
    // Check if table exists
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reports'").all();
    console.log('Table exists:', tables.length > 0);
    
    // Count reports
    const count = db.prepare('SELECT COUNT(*) as total FROM reports').get();
    console.log('Total reports:', count.total);
    
    // Show all reports
    const reports = db.prepare('SELECT id, user_id, type, created_at FROM reports ORDER BY created_at DESC LIMIT 10').all();
    console.log('Recent reports:', JSON.stringify(reports, null, 2));
    
} catch (error) {
    console.error('ERROR:', error.message);
}

db.close();
