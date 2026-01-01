const db = require('better-sqlite3')('/app/data/taskflow.db');
const users = db.prepare('SELECT id, name, username, role FROM users').all();
console.log('=== 用戶列表 ===');
users.forEach(u => {
    console.log(u.username + ' | ' + u.name + ' | ' + u.role);
});
