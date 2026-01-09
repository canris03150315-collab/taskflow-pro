const Database = require('./node_modules/better-sqlite3');
const bcrypt = require('bcrypt');

const db = new Database('/app/data/taskflow.db');

console.log('開始初始化資料庫...');

// 清空所有數據表（保留結構）
console.log('1. 清空數據表...');
db.exec('DELETE FROM attendance_records');
db.exec('DELETE FROM chat_messages');
db.exec('DELETE FROM chat_channels');
db.exec('DELETE FROM tasks');
db.exec('DELETE FROM task_timeline');
db.exec('DELETE FROM announcements');
db.exec('DELETE FROM system_logs');
db.exec('DELETE FROM sync_queue');

// 清空用戶（除了管理員）
db.exec('DELETE FROM users');

// 重置部門
db.exec('DELETE FROM departments');

// 創建預設部門
console.log('2. 創建預設部門...');
const departments = [
    { id: 'dept-admin', name: '管理部', description: '系統管理部門' },
    { id: 'dept-sales', name: '業務部', description: '業務銷售部門' },
    { id: 'dept-tech', name: '技術部', description: '技術開發部門' },
    { id: 'dept-unassigned', name: '待分配新人', description: '尚未分配部門的新進人員' }
];

const insertDept = db.prepare('INSERT INTO departments (id, name, description) VALUES (?, ?, ?)');
departments.forEach(dept => {
    insertDept.run(dept.id, dept.name, dept.description);
});

// 創建管理員帳號
console.log('3. 創建管理員帳號...');
const adminPassword = bcrypt.hashSync('admin123', 10);
const adminId = 'user-admin-' + Date.now();

db.prepare(`
    INSERT INTO users (id, username, password, name, role, department, phone, email, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
    adminId,
    'admin',
    adminPassword,
    '系統管理員',
    'BOSS',
    'dept-admin',
    '',
    '',
    new Date().toISOString()
);

console.log('');
console.log('✅ 資料庫初始化完成！');
console.log('');
console.log('管理員帳號:');
console.log('  用戶名: admin');
console.log('  密碼: admin123');
console.log('  角色: BOSS');
console.log('');

// 顯示統計
const stats = {
    users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
    departments: db.prepare('SELECT COUNT(*) as count FROM departments').get().count,
    attendance: db.prepare('SELECT COUNT(*) as count FROM attendance_records').get().count,
    tasks: db.prepare('SELECT COUNT(*) as count FROM tasks').get().count
};

console.log('資料庫統計:');
console.log('  用戶: ' + stats.users);
console.log('  部門: ' + stats.departments);
console.log('  打卡記錄: ' + stats.attendance);
console.log('  任務: ' + stats.tasks);

db.close();
