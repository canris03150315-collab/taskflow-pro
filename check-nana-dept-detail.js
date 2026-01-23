const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Detailed NANA Department Check ===\n');

// 1. NANA user complete info
console.log('1. NANA complete user info:');
const nana = db.prepare("SELECT * FROM users WHERE name = 'NANA'").get();
if (nana) {
    console.log('   ID:', nana.id);
    console.log('   Name:', nana.name);
    console.log('   Username:', nana.username);
    console.log('   Department field:', nana.department);
    console.log('   Role:', nana.role);
}

// 2. Check NANA's schedule records with department_id
console.log('\n2. NANA schedule records (with department_id):');
const schedules = db.prepare("SELECT * FROM schedules WHERE user_id = ?").all(nana.id);
console.log(`   Total: ${schedules.length}`);
schedules.forEach(s => {
    console.log(`   - ID: ${s.id}`);
    console.log(`     department_id: ${s.department_id}`);
    console.log(`     year: ${s.year}, month: ${s.month}`);
    console.log(`     status: ${s.status}`);
    console.log(`     selected_days: ${s.selected_days}`);
});

// 3. Check if department field matches
console.log('\n3. Department field comparison:');
console.log(`   User.department: ${nana.department}`);
if (schedules.length > 0) {
    console.log(`   Schedule.department_id: ${schedules[0].department_id}`);
    console.log(`   Match: ${nana.department === schedules[0].department_id}`);
}

// 4. Check departments table
console.log('\n4. Check departments table:');
const depts = db.prepare("SELECT * FROM departments WHERE id LIKE '%63%' OR name LIKE '%63%'").all();
console.log(`   Found ${depts.length} departments with '63':`);
depts.forEach(d => {
    console.log(`   - ID: ${d.id}, Name: ${d.name}`);
});

// 5. Check all departments
console.log('\n5. All departments:');
const allDepts = db.prepare("SELECT id, name FROM departments ORDER BY name").all();
allDepts.forEach(d => {
    console.log(`   - ${d.id}: ${d.name}`);
});

// 6. Find which department NANA belongs to
console.log('\n6. Find NANA department info:');
const nanaDept = db.prepare("SELECT * FROM departments WHERE id = ?").get(nana.department);
if (nanaDept) {
    console.log(`   Department ID: ${nanaDept.id}`);
    console.log(`   Department Name: ${nanaDept.name}`);
} else {
    console.log('   ERROR: Department not found!');
}

db.close();
console.log('\n=== Analysis Complete ===');
