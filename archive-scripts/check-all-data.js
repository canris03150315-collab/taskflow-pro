const db = require('better-sqlite3')('/app/data/taskflow.db');

console.log('=== 用戶 ===');
const users = db.prepare('SELECT id, name, username, role FROM users').all();
users.forEach(u => console.log(u.name, '|', u.role));

console.log('\n=== 部門 ===');
try {
    const depts = db.prepare('SELECT * FROM departments').all();
    depts.forEach(d => console.log(d.id, '|', d.name));
} catch(e) { console.log('無部門資料或表不存在'); }

console.log('\n=== 任務 ===');
try {
    const tasks = db.prepare('SELECT id, title, status FROM tasks').all();
    console.log('任務數量:', tasks.length);
    tasks.slice(0, 5).forEach(t => console.log(t.title, '|', t.status));
} catch(e) { console.log('無任務資料'); }

console.log('\n=== 報表 ===');
try {
    const reports = db.prepare('SELECT id, created_at FROM reports').all();
    console.log('報表數量:', reports.length);
} catch(e) { console.log('無報表資料'); }

console.log('\n=== 公告 ===');
try {
    const anns = db.prepare('SELECT id, title FROM announcements').all();
    console.log('公告數量:', anns.length);
} catch(e) { console.log('無公告資料'); }
