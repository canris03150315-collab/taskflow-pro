const Database = require('./node_modules/better-sqlite3');
const bcrypt = require('bcrypt');

const db = new Database('/app/data/taskflow.db');

console.log('\u958b\u59cb\u521d\u59cb\u5316\u8cc7\u6599\u5eab...');

// Clear all data tables (keep structure)
console.log('1. \u6e05\u7a7a\u6578\u64da\u8868...');
db.exec('DELETE FROM attendance_records');
db.exec('DELETE FROM chat_messages');
db.exec('DELETE FROM chat_channels');
db.exec('DELETE FROM tasks');
db.exec('DELETE FROM task_timeline');
db.exec('DELETE FROM announcements');
db.exec('DELETE FROM system_logs');
db.exec('DELETE FROM sync_queue');

// Clear users
db.exec('DELETE FROM users');

// Reset departments
db.exec('DELETE FROM departments');

// Create default departments
console.log('2. \u5275\u5efa\u9810\u8a2d\u90e8\u9580...');
const departments = [
    { id: 'dept-admin', name: '\u7ba1\u7406\u90e8', description: '\u7cfb\u7d71\u7ba1\u7406\u90e8\u9580' },
    { id: 'dept-sales', name: '\u696d\u52d9\u90e8', description: '\u696d\u52d9\u92b7\u552e\u90e8\u9580' },
    { id: 'dept-tech', name: '\u6280\u8853\u90e8', description: '\u6280\u8853\u958b\u767c\u90e8\u9580' },
    { id: 'dept-unassigned', name: '\u5f85\u5206\u914d\u65b0\u4eba', description: '\u5c1a\u672a\u5206\u914d\u90e8\u9580\u7684\u65b0\u9032\u4eba\u54e1' }
];

const insertDept = db.prepare('INSERT INTO departments (id, name, description) VALUES (?, ?, ?)');
departments.forEach(dept => {
    insertDept.run(dept.id, dept.name, dept.description);
});

// Create admin account
console.log('3. \u5275\u5efa\u7ba1\u7406\u54e1\u5e33\u865f...');
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
console.log('\u2705 \u8cc7\u6599\u5eab\u521d\u59cb\u5316\u5b8c\u6210\uff01');
console.log('');
console.log('\u7ba1\u7406\u54e1\u5e33\u865f:');
console.log('  \u7528\u6236\u540d: admin');
console.log('  \u5bc6\u78bc: admin123');
console.log('  \u89d2\u8272: BOSS');
console.log('');

// Show statistics
const stats = {
    users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
    departments: db.prepare('SELECT COUNT(*) as count FROM departments').get().count,
    attendance: db.prepare('SELECT COUNT(*) as count FROM attendance_records').get().count,
    tasks: db.prepare('SELECT COUNT(*) as count FROM tasks').get().count
};

console.log('\u8cc7\u6599\u5eab\u7d71\u8a08:');
console.log('  \u7528\u6236: ' + stats.users);
console.log('  \u90e8\u9580: ' + stats.departments);
console.log('  \u6253\u5361\u8a18\u9304: ' + stats.attendance);
console.log('  \u4efb\u52d9: ' + stats.tasks);

db.close();
