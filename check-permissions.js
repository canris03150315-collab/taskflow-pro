const db = require('better-sqlite3')('/app/data/taskflow.db');
const users = db.prepare('SELECT id, name, role, permissions FROM users').all();
console.log('=== 用戶權限列表 ===');
users.forEach(u => {
    console.log(`${u.name} (${u.role}): ${u.permissions || '無權限'}`);
});
