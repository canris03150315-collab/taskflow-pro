const Database = require('better-sqlite3');
const path = require('path');

console.log('=== Diagnose Reports 7-Day Issue ===\n');

const dbPath = path.join('/app/data', 'taskflow.db');
const db = new Database(dbPath);

console.log('1. Checking all reports in database:\n');
const allReports = db.prepare('SELECT id, user_id, created_at FROM reports ORDER BY created_at DESC').all();

console.log(`Total reports: ${allReports.length}\n`);

if (allReports.length > 0) {
    console.log('Recent 10 reports:');
    allReports.slice(0, 10).forEach((r, i) => {
        const createdDate = new Date(r.created_at);
        const now = new Date();
        const daysDiff = (now - createdDate) / (1000 * 60 * 60 * 24);
        console.log(`  ${i+1}. ID: ${r.id}, User: ${r.user_id}, Created: ${r.created_at}, Age: ${daysDiff.toFixed(1)} days`);
    });
} else {
    console.log('❌ NO REPORTS IN DATABASE!');
}

console.log('\n2. Checking reports within 7 days:\n');
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
const sevenDaysAgoStr = sevenDaysAgo.toISOString();

console.log(`Now: ${new Date().toISOString()}`);
console.log(`7 days ago: ${sevenDaysAgoStr}`);

const recentReports = db.prepare('SELECT id, user_id, created_at FROM reports WHERE created_at > ? ORDER BY created_at DESC').all(sevenDaysAgoStr);

console.log(`\nReports within 7 days: ${recentReports.length}`);
if (recentReports.length > 0) {
    recentReports.forEach((r, i) => {
        console.log(`  ${i+1}. ID: ${r.id}, User: ${r.user_id}, Created: ${r.created_at}`);
    });
} else {
    console.log('  ⚠️  No reports within 7 days - this is why user sees empty list!');
}

console.log('\n3. Checking users:\n');
const users = db.prepare('SELECT id, username, role, department FROM users LIMIT 5').all();
users.forEach(u => {
    console.log(`  User ${u.id}: ${u.username} (${u.role}, Dept: ${u.department || 'N/A'})`);
    const userReports = db.prepare('SELECT COUNT(*) as cnt FROM reports WHERE user_id = ?').get(u.id);
    const userRecent = db.prepare('SELECT COUNT(*) as cnt FROM reports WHERE user_id = ? AND created_at > ?').get(u.id, sevenDaysAgoStr);
    console.log(`    Total reports: ${userReports.cnt}, Within 7 days: ${userRecent.cnt}`);
});

console.log('\n4. Checking GET route implementation:\n');
const fs = require('fs');
const reportsJs = fs.readFileSync('/app/dist/routes/reports.js', 'utf8');

const has7DayCode = reportsJs.includes('sevenDaysAgo');
const hasSupervisor = reportsJs.includes('currentUser.role === "SUPERVISOR"');
const hasEmployeeFilter = reportsJs.includes('currentUser.role === "EMPLOYEE"');

console.log(`  7-day filter code: ${has7DayCode ? '✅' : '❌'}`);
console.log(`  SUPERVISOR check: ${hasSupervisor ? '✅' : '❌'}`);
console.log(`  EMPLOYEE check: ${hasEmployeeFilter ? '✅' : '❌'}`);

if (has7DayCode) {
    // Check exact query
    const getRouteMatch = reportsJs.match(/created_at > \?/g);
    if (getRouteMatch) {
        console.log(`  ✅ Found ${getRouteMatch.length} created_at filters`);
    }
}

console.log('\n=== Diagnosis Complete ===');
console.log('\n📊 Summary:');
console.log(`  - Total reports: ${allReports.length}`);
console.log(`  - Reports in last 7 days: ${recentReports.length}`);
console.log(`  - Code has 7-day filter: ${has7DayCode ? 'YES' : 'NO'}`);

if (allReports.length === 0) {
    console.log('\n❗ ISSUE: No reports exist in database. User needs to create a report first.');
} else if (recentReports.length === 0) {
    console.log('\n❗ ISSUE: All reports are older than 7 days. 7-day filter is working correctly.');
    console.log('   User won\'t see any reports until they create a new one.');
} else {
    console.log('\n✅ Reports exist within 7 days. Should be visible to users.');
}

db.close();
