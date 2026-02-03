const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Check Schedule NANA Issue ===\n');

// 1. Check NANA user
console.log('1. NANA user info:');
const nana = db.prepare("SELECT id, name, username, department FROM users WHERE name = 'NANA'").get();
if (nana) {
    console.log('   User ID:', nana.id);
    console.log('   Name:', nana.name);
    console.log('   Department:', nana.department);
    console.log('   Username:', nana.username);
} else {
    console.log('   ERROR: NANA user not found');
}

// 2. Check DEPT_63 users
console.log('\n2. DEPT_63 users:');
const dept63Users = db.prepare("SELECT id, name, department FROM users WHERE department = 'DEPT_63'").all();
console.log(`   Total users: ${dept63Users.length}`);
dept63Users.forEach(u => {
    console.log(`   - ${u.name} (${u.id})`);
});

// 3. Check schedules table structure
console.log('\n3. schedules table structure:');
const tableInfo = db.prepare("PRAGMA table_info(schedules)").all();
console.log('   Columns:');
tableInfo.forEach(col => {
    console.log(`   - ${col.name} (${col.type})`);
});

// 4. Check NANA schedules
console.log('\n4. NANA schedule records:');
if (nana) {
    const schedules = db.prepare("SELECT * FROM schedules WHERE user_id = ?").all(nana.id);
    console.log(`   Total records: ${schedules.length}`);
    
    if (schedules.length > 0) {
        schedules.forEach(s => {
            console.log(`   - Month: ${s.month}, Status: ${s.status}`);
            console.log(`     Dates: ${s.dates}`);
            console.log(`     Reviewed by: ${s.reviewed_by || 'None'}`);
            console.log(`     Days: ${s.days}`);
        });
    } else {
        console.log('   ERROR: No schedule records found');
    }
}

// 5. Check all DEPT_63 schedules
console.log('\n5. All DEPT_63 schedule records:');
const dept63Schedules = db.prepare(`
    SELECT s.*, u.name, u.department 
    FROM schedules s 
    JOIN users u ON s.user_id = u.id 
    WHERE u.department = 'DEPT_63'
    ORDER BY s.month DESC, u.name
`).all();
console.log(`   Total records: ${dept63Schedules.length}`);

if (dept63Schedules.length > 0) {
    dept63Schedules.forEach(s => {
        console.log(`   - ${s.name}: Month ${s.month}, Status ${s.status}, Days ${s.days}`);
    });
}

// 6. Check 2026-01 schedules for DEPT_63
console.log('\n6. DEPT_63 schedules for 2026-01:');
const jan2026 = db.prepare(`
    SELECT s.*, u.name, u.department 
    FROM schedules s 
    JOIN users u ON s.user_id = u.id 
    WHERE u.department = 'DEPT_63' AND s.month = '2026-01'
    ORDER BY u.name
`).all();
console.log(`   Total records: ${jan2026.length}`);

if (jan2026.length > 0) {
    jan2026.forEach(s => {
        console.log(`   - ${s.name}:`);
        console.log(`     Status: ${s.status}`);
        console.log(`     Dates: ${s.dates}`);
        console.log(`     Days: ${s.days}`);
    });
} else {
    console.log('   ERROR: No 2026-01 schedules found');
}

// 7. Check if there are any schedules at all
console.log('\n7. All schedules in database:');
const allSchedules = db.prepare("SELECT COUNT(*) as count FROM schedules").get();
console.log(`   Total schedules: ${allSchedules.count}`);

db.close();
console.log('\n=== Diagnosis Complete ===');
