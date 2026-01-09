const Database = require('./node_modules/better-sqlite3');

try {
    console.log('Opening database...');
    const db = new Database('/app/data/taskflow.db');
    
    console.log('Checking users table...');
    const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log('Users count:', users.count);
    
    console.log('Checking if database is corrupted...');
    const integrityCheck = db.pragma('integrity_check');
    console.log('Integrity check:', integrityCheck);
    
    console.log('Checking user data...');
    const userList = db.prepare('SELECT id, username, name, role FROM users').all();
    console.log('Users:', JSON.stringify(userList, null, 2));
    
    db.close();
    console.log('SUCCESS: Database is OK');
} catch (error) {
    console.error('ERROR: Database check failed');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
}
