const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Testing SUPERVISOR add user logic...');

const currentUser = {
    role: 'SUPERVISOR',
    department: 'dept-001'
};

const test1Dept = 'dept-001';
const test1Result = test1Dept === currentUser.department || test1Dept === 'dept-unassigned';
console.log('Test 1 - Add to own department:', test1Dept, test1Result ? 'PASS' : 'FAIL');

const test2Dept = 'dept-unassigned';
const test2Result = test2Dept === currentUser.department || test2Dept === 'dept-unassigned';
console.log('Test 2 - Add to dept-unassigned:', test2Dept, test2Result ? 'PASS' : 'FAIL');

const test3Dept = 'dept-002';
const test3Result = test3Dept === currentUser.department || test3Dept === 'dept-unassigned';
console.log('Test 3 - Add to other department:', test3Dept, test3Result ? 'FAIL' : 'PASS');

const deptExists = db.prepare('SELECT id, name FROM departments WHERE id = ?').get('dept-unassigned');
console.log('dept-unassigned exists:', deptExists ? 'YES' : 'NO');
if (deptExists) {
    console.log('Department info:', JSON.stringify(deptExists));
}

const allDepts = db.prepare('SELECT id, name FROM departments').all();
console.log('All departments:');
allDepts.forEach(d => console.log('  -', d.id, ':', d.name));

db.close();
console.log('Test complete!');
