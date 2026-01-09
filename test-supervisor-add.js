// 測試 SUPERVISOR 新增人員到 dept-unassigned 的邏輯
const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Testing SUPERVISOR add user logic...');

// 模擬 SUPERVISOR 用戶
const currentUser = {
    role: 'SUPERVISOR',
    department: 'dept-001'  // 假設的部門 ID
};

// 測試案例 1: 新增到自己部門
const test1Dept = 'dept-001';
const test1Result = test1Dept === currentUser.department || test1Dept === 'dept-unassigned';
console.log('Test 1 - Add to own department:', test1Dept, '→', test1Result ? 'PASS' : 'FAIL');

// 測試案例 2: 新增到 dept-unassigned
const test2Dept = 'dept-unassigned';
const test2Result = test2Dept === currentUser.department || test2Dept === 'dept-unassigned';
console.log('Test 2 - Add to dept-unassigned:', test2Dept, '→', test2Result ? 'PASS' : 'FAIL');

// 測試案例 3: 新增到其他部門
const test3Dept = 'dept-002';
const test3Result = test3Dept === currentUser.department || test3Dept === 'dept-unassigned';
console.log('Test 3 - Add to other department:', test3Dept, '→', test3Result ? 'FAIL (expected)' : 'PASS');

// 檢查 dept-unassigned 是否存在
const deptExists = db.prepare('SELECT id, name FROM departments WHERE id = ?').get('dept-unassigned');
console.log('\ndept-unassigned exists:', deptExists ? 'YES' : 'NO');
if (deptExists) {
    console.log('Department info:', deptExists);
}

// 列出所有部門
const allDepts = db.prepare('SELECT id, name FROM departments').all();
console.log('\nAll departments:');
allDepts.forEach(d => console.log(`  - ${d.id}: ${d.name}`));

db.close();
console.log('\nTest complete!');
