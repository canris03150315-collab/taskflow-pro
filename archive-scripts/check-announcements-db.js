const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Checking announcements table...');

try {
    const rows = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5').all();
    console.log('Total announcements:', rows.length);
    console.log('Announcements:', JSON.stringify(rows, null, 2));
} catch (error) {
    console.error('ERROR:', error.message);
}

db.close();
