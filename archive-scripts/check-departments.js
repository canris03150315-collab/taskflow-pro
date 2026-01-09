const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== 檢查部門數據 ===\n');

// 查詢所有部門
const departments = db.prepare('SELECT * FROM departments ORDER BY created_at').all();

console.log('部門總數:', departments.length);
console.log('');

departments.forEach((dept, index) => {
    console.log(`${index + 1}. ${dept.name}`);
    console.log(`   ID: ${dept.id}`);
    console.log(`   主部門 ID: ${dept.parent_id || '無（頂層部門）'}`);
    console.log(`   創建時間: ${dept.created_at}`);
    console.log('');
});

// 檢查是否有這三個預設部門
const defaultDepts = ['市場行銷部', '人力機資源部', '技術工程部'];
console.log('檢查預設部門:');
defaultDepts.forEach(name => {
    const dept = departments.find(d => d.name === name);
    if (dept) {
        console.log(`  ⚠️ ${name} - 存在於資料庫中 (ID: ${dept.id})`);
    } else {
        console.log(`  ✅ ${name} - 不存在`);
    }
});

db.close();
console.log('\n檢查完成！');
