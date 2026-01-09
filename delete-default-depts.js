const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== 刪除預設部門 ===\n');

const deptsToDelete = ['Marketing', 'Engineering', 'HR'];

deptsToDelete.forEach(deptId => {
    const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(deptId);
    
    if (dept) {
        console.log(`刪除: ${dept.name} (${deptId})`);
        db.prepare('DELETE FROM departments WHERE id = ?').run(deptId);
        console.log('  ✅ 已刪除');
    } else {
        console.log(`ℹ️ ${deptId} - 不存在`);
    }
});

console.log('\n檢查剩餘部門:');
const remaining = db.prepare('SELECT * FROM departments').all();
remaining.forEach((dept, i) => {
    console.log(`  ${i + 1}. ${dept.name} (${dept.id})`);
});

db.close();
console.log('\n完成！');
