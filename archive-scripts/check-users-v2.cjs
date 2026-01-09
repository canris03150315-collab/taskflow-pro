const db = require('better-sqlite3')('/app/data/taskflow.db');

console.log('=== 用戶列表 ===');
const users = db.prepare('SELECT id, name, username, role FROM users').all();
users.forEach(u => console.log(`${u.username} | ${u.name} | ${u.role}`));

db.close();
