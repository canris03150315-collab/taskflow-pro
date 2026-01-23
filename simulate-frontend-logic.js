const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Simulate Frontend Schedule Display Logic ===\n');

// Simulate frontend data
const selectedDepartment = 'j06ng7vy3'; // 63 department ID
const selectedMonth = { year: 2026, month: 1 };
const canApprove = true; // BOSS viewing

console.log('Frontend State:');
console.log(`  selectedDepartment: ${selectedDepartment}`);
console.log(`  selectedMonth: ${selectedMonth.year}-${selectedMonth.month}`);
console.log(`  canApprove: ${canApprove}`);

// Step 1: Load schedules (simulate backend API response)
console.log('\n1. Backend API: GET /api/schedules');
const allSchedules = db.prepare(`
    SELECT * FROM schedules 
    ORDER BY year DESC, month DESC, submitted_at DESC
`).all();
console.log(`   Total schedules returned: ${allSchedules.length}`);

// Step 2: Frontend getApprovedSchedules() filter
console.log('\n2. Frontend getApprovedSchedules() filter:');
const approvedSchedules = allSchedules.filter(s => {
    const statusMatch = s.status === 'APPROVED';
    const yearMatch = s.year === selectedMonth.year;
    const monthMatch = s.month === selectedMonth.month;
    const deptMatch = canApprove ? s.department_id === selectedDepartment : false;
    
    const pass = statusMatch && yearMatch && monthMatch && deptMatch;
    
    if (s.department_id === selectedDepartment) {
        console.log(`   Schedule ${s.id.substring(0, 20)}...:`);
        console.log(`     status=${s.status}, match=${statusMatch}`);
        console.log(`     year=${s.year}, match=${yearMatch}`);
        console.log(`     month=${s.month}, match=${monthMatch}`);
        console.log(`     dept_id=${s.department_id}, match=${deptMatch}`);
        console.log(`     PASS: ${pass}`);
    }
    
    return pass;
});

console.log(`   Approved schedules count: ${approvedSchedules.length}`);
approvedSchedules.forEach(s => {
    const user = db.prepare("SELECT name FROM users WHERE id = ?").get(s.user_id);
    console.log(`   - ${user ? user.name : 'Unknown'}: ${s.selected_days}`);
});

// Step 3: Load users for department
console.log('\n3. Frontend users.filter(u => u.department === selectedDepartment):');
const deptUsers = db.prepare("SELECT * FROM users WHERE department = ?").all(selectedDepartment);
console.log(`   Department users count: ${deptUsers.length}`);
deptUsers.forEach(u => {
    console.log(`   - ${u.name} (${u.id.substring(0, 20)}...)`);
});

// Step 4: Simulate getUsersOffDuty for each day
console.log('\n4. Simulate getUsersOffDuty() for selected days:');
const testDays = [11, 17, 24, 25, 31];

testDays.forEach(day => {
    console.log(`\n   Day ${day}:`);
    
    const usersOffDuty = deptUsers.filter(user => {
        const userSchedule = approvedSchedules.find(s => s.user_id === user.id);
        
        if (userSchedule) {
            const offDays = JSON.parse(userSchedule.selected_days || '[]');
            const isOff = offDays.includes(day);
            console.log(`     ${user.name}: schedule found, days=${userSchedule.selected_days}, isOff=${isOff}`);
            return isOff;
        } else {
            console.log(`     ${user.name}: NO schedule found`);
            return false;
        }
    });
    
    console.log(`     Off duty: ${usersOffDuty.map(u => u.name).join(', ') || 'None'}`);
});

// Step 5: Check if there's any data inconsistency
console.log('\n5. Data consistency check:');
deptUsers.forEach(user => {
    const userSchedule = approvedSchedules.find(s => s.user_id === user.id);
    const dbSchedule = db.prepare(`
        SELECT * FROM schedules 
        WHERE user_id = ? AND status = 'APPROVED' AND year = ? AND month = ?
    `).get(user.id, selectedMonth.year, selectedMonth.month);
    
    console.log(`   ${user.name}:`);
    console.log(`     Found in approvedSchedules: ${userSchedule ? 'YES' : 'NO'}`);
    console.log(`     Exists in DB: ${dbSchedule ? 'YES' : 'NO'}`);
    
    if (dbSchedule && !userSchedule) {
        console.log(`     ⚠️ MISMATCH: DB has record but frontend filter removed it`);
        console.log(`       DB record: id=${dbSchedule.id}, dept=${dbSchedule.department_id}`);
    }
});

db.close();
console.log('\n=== Simulation Complete ===');
