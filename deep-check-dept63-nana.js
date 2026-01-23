const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Deep Check DEPT_63 NANA Issue ===\n');

// 1. Check all users in dept 63
console.log('1. All users with department containing "63":');
const dept63Users = db.prepare("SELECT id, name, username, department, role FROM users WHERE department LIKE '%63%' OR department = 'j06ng7vy3'").all();
console.log(`   Total: ${dept63Users.length}`);
dept63Users.forEach(u => {
    console.log(`   - ${u.name} (${u.username})`);
    console.log(`     ID: ${u.id}`);
    console.log(`     Department: ${u.department}`);
    console.log(`     Role: ${u.role}`);
});

// 2. Check department table
console.log('\n2. Department 63 info:');
const dept63 = db.prepare("SELECT * FROM departments WHERE name LIKE '%63%'").all();
dept63.forEach(d => {
    console.log(`   ID: ${d.id}`);
    console.log(`   Name: ${d.name}`);
});

// 3. Check all schedules for dept 63 users
console.log('\n3. All schedules for dept 63 users:');
const dept63UserIds = dept63Users.map(u => u.id);
if (dept63UserIds.length > 0) {
    const placeholders = dept63UserIds.map(() => '?').join(',');
    const schedules = db.prepare(`
        SELECT s.*, u.name, u.department as user_dept
        FROM schedules s
        JOIN users u ON s.user_id = u.id
        WHERE s.user_id IN (${placeholders})
        ORDER BY s.month DESC, u.name
    `).all(...dept63UserIds);
    
    console.log(`   Total schedules: ${schedules.length}`);
    schedules.forEach(s => {
        console.log(`   - ${s.name}:`);
        console.log(`     Schedule ID: ${s.id}`);
        console.log(`     User Dept: ${s.user_dept}`);
        console.log(`     Schedule Dept ID: ${s.department_id}`);
        console.log(`     Match: ${s.user_dept === s.department_id}`);
        console.log(`     Month: ${s.year}-${s.month}, Status: ${s.status}`);
        console.log(`     Selected Days: ${s.selected_days}`);
    });
}

// 4. Check NANA specifically
console.log('\n4. NANA detailed check:');
const nana = dept63Users.find(u => u.name === 'NANA');
if (nana) {
    console.log(`   User ID: ${nana.id}`);
    console.log(`   Department field: ${nana.department}`);
    
    // Check if department ID matches department table
    const nanaDept = db.prepare("SELECT * FROM departments WHERE id = ?").get(nana.department);
    if (nanaDept) {
        console.log(`   Department in table:`);
        console.log(`     ID: ${nanaDept.id}`);
        console.log(`     Name: ${nanaDept.name}`);
    }
    
    // Get NANA schedules
    const nanaSchedules = db.prepare("SELECT * FROM schedules WHERE user_id = ?").all(nana.id);
    console.log(`\n   NANA schedules: ${nanaSchedules.length}`);
    nanaSchedules.forEach(s => {
        console.log(`   - Schedule ${s.id}:`);
        console.log(`     department_id: ${s.department_id}`);
        console.log(`     Match with user dept: ${s.department_id === nana.department}`);
        console.log(`     Year: ${s.year}, Month: ${s.month}`);
        console.log(`     Status: ${s.status}`);
        console.log(`     Selected days: ${s.selected_days}`);
    });
}

// 5. Compare with other dept 63 users who are displaying correctly
console.log('\n5. Compare with other dept 63 users:');
const otherUsers = dept63Users.filter(u => u.name !== 'NANA');
otherUsers.forEach(u => {
    const userSchedules = db.prepare("SELECT * FROM schedules WHERE user_id = ? AND status = 'APPROVED'").all(u.id);
    console.log(`   ${u.name}:`);
    console.log(`     Department: ${u.department}`);
    console.log(`     APPROVED schedules: ${userSchedules.length}`);
    if (userSchedules.length > 0) {
        userSchedules.forEach(s => {
            console.log(`       - Dept ID: ${s.department_id}, Match: ${s.department_id === u.department}`);
        });
    }
});

// 6. Check if there are any department ID mismatches
console.log('\n6. Department ID consistency check:');
const allSchedules = db.prepare(`
    SELECT s.*, u.name, u.department as user_dept
    FROM schedules s
    JOIN users u ON s.user_id = u.id
    WHERE s.status = 'APPROVED'
`).all();

const mismatches = allSchedules.filter(s => s.department_id !== s.user_dept);
console.log(`   Total mismatches: ${mismatches.length}`);
if (mismatches.length > 0) {
    mismatches.forEach(m => {
        console.log(`   - ${m.name}:`);
        console.log(`     User dept: ${m.user_dept}`);
        console.log(`     Schedule dept: ${m.department_id}`);
    });
}

db.close();
console.log('\n=== Deep Check Complete ===');
