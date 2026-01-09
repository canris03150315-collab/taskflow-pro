const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Checking user roles...');

try {
    const users = db.prepare("SELECT id, username, name, role FROM users WHERE id IN ('user-1767326481715-40lkufxrh', 'admin-1767325980478')").all();
    console.log('Users:', JSON.stringify(users, null, 2));
    
    // Check all reports with user info
    const reportsWithUsers = db.prepare(`
        SELECT r.id, r.user_id, r.type, r.created_at, u.username, u.name, u.role
        FROM reports r
        LEFT JOIN users u ON r.user_id = u.id
        ORDER BY r.created_at DESC
    `).all();
    console.log('\nReports with user info:', JSON.stringify(reportsWithUsers, null, 2));
    
} catch (error) {
    console.error('ERROR:', error.message);
}

db.close();
