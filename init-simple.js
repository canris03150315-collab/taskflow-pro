const Database = require('./node_modules/better-sqlite3');
const bcrypt = require('bcrypt');

const db = new Database('/app/data/taskflow.db');

console.log('START: Database initialization');

// Clear all data
console.log('1. Clearing data...');
db.exec('DELETE FROM attendance_records');
db.exec('DELETE FROM chat_messages');
db.exec('DELETE FROM chat_channels');
db.exec('DELETE FROM tasks');
db.exec('DELETE FROM task_timeline');
db.exec('DELETE FROM announcements');
db.exec('DELETE FROM system_logs');
db.exec('DELETE FROM sync_queue');
db.exec('DELETE FROM users');
db.exec('DELETE FROM departments');

// Create departments
console.log('2. Creating departments...');
const insertDept = db.prepare('INSERT INTO departments (id, name) VALUES (?, ?)');
insertDept.run('dept-admin', '\u7ba1\u7406\u90e8');
insertDept.run('dept-sales', '\u696d\u52d9\u90e8');
insertDept.run('dept-tech', '\u6280\u8853\u90e8');
insertDept.run('dept-unassigned', '\u5f85\u5206\u914d\u65b0\u4eba');

// Create admin
console.log('3. Creating admin...');
const adminPassword = bcrypt.hashSync('admin123', 10);
const adminId = 'user-admin-' + Date.now();

db.prepare(`
    INSERT INTO users (id, username, password, name, role, department, phone, email, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
    adminId,
    'admin',
    adminPassword,
    '\u7cfb\u7d71\u7ba1\u7406\u54e1',
    'BOSS',
    'dept-admin',
    '',
    '',
    new Date().toISOString()
);

console.log('');
console.log('SUCCESS: Database initialized');
console.log('Admin: admin / admin123');
console.log('');

const stats = {
    users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
    departments: db.prepare('SELECT COUNT(*) as count FROM departments').get().count
};

console.log('Stats: Users=' + stats.users + ' Departments=' + stats.departments);

db.close();
