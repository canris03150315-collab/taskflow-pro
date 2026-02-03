const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== 檢查假表月曆 NANA 不顯示問題 ===\n');

// 1. 檢查 NANA 用戶信息
console.log('1. NANA 用戶信息:');
const nana = db.prepare("SELECT id, name, username, department FROM users WHERE name = 'NANA'").get();
if (nana) {
    console.log('   用戶 ID:', nana.id);
    console.log('   用戶名:', nana.name);
    console.log('   部門:', nana.department);
    console.log('   Username:', nana.username);
} else {
    console.log('   ❌ 找不到 NANA 用戶');
}

// 2. 檢查 63 部門
console.log('\n2. 63 部門信息:');
const dept63Users = db.prepare("SELECT id, name, department FROM users WHERE department = 'DEPT_63'").all();
console.log(`   63 部門用戶數: ${dept63Users.length}`);
dept63Users.forEach(u => {
    console.log(`   - ${u.name} (${u.id})`);
});

// 3. 檢查 schedules 表結構
console.log('\n3. schedules 表結構:');
const tableInfo = db.prepare("PRAGMA table_info(schedules)").all();
console.log('   欄位列表:');
tableInfo.forEach(col => {
    console.log(`   - ${col.name} (${col.type})`);
});

// 4. 檢查 NANA 的排班記錄
console.log('\n4. NANA 的排班記錄:');
if (nana) {
    const schedules = db.prepare("SELECT * FROM schedules WHERE user_id = ?").all(nana.id);
    console.log(`   記錄數: ${schedules.length}`);
    
    if (schedules.length > 0) {
        schedules.forEach(s => {
            console.log(`   - 月份: ${s.month}, 狀態: ${s.status}`);
            console.log(`     日期: ${s.dates}`);
            console.log(`     審核者: ${s.reviewed_by || '無'}`);
        });
    } else {
        console.log('   ❌ 沒有排班記錄');
    }
}

// 5. 檢查 63 部門所有排班記錄
console.log('\n5. 63 部門所有排班記錄:');
const dept63Schedules = db.prepare(`
    SELECT s.*, u.name, u.department 
    FROM schedules s 
    JOIN users u ON s.user_id = u.id 
    WHERE u.department = 'DEPT_63'
    ORDER BY s.month DESC
`).all();
console.log(`   總記錄數: ${dept63Schedules.length}`);

if (dept63Schedules.length > 0) {
    dept63Schedules.forEach(s => {
        console.log(`   - ${s.name}: 月份 ${s.month}, 狀態 ${s.status}`);
    });
}

// 6. 檢查 2026-01 的排班記錄
console.log('\n6. 2026-01 月份的 63 部門排班:');
const jan2026 = db.prepare(`
    SELECT s.*, u.name, u.department 
    FROM schedules s 
    JOIN users u ON s.user_id = u.id 
    WHERE u.department = 'DEPT_63' AND s.month = '2026-01'
`).all();
console.log(`   記錄數: ${jan2026.length}`);

if (jan2026.length > 0) {
    jan2026.forEach(s => {
        console.log(`   - ${s.name}:`);
        console.log(`     狀態: ${s.status}`);
        console.log(`     日期: ${s.dates}`);
    });
} else {
    console.log('   ❌ 沒有 2026-01 的排班記錄');
}

db.close();
console.log('\n=== 診斷完成 ===');
