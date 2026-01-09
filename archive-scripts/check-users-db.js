const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');
const users = db.prepare('SELECT id, username, name, role FROM users').all();
console.log('Users in database:', JSON.stringify(users, null, 2));
db.close();
