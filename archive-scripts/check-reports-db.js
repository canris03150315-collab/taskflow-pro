const Database = require('better-sqlite3');
const path = require('path');

console.log('=== Reports Database Check ===\n');

const dbPath = path.join('/app/data', 'taskflow.db');
const db = new Database(dbPath);

// 1. Check total reports
const allReports = db.prepare('SELECT id, user_id, created_at FROM reports ORDER BY created_at DESC').all();
console.log('1. Total reports:', allReports.length, '\n');

if (allReports.length > 0) {
    console.log('Recent 5 reports:');
    allReports.slice(0, 5).forEach((r, i) => {
        const age = ((new Date() - new Date(r.created_at)) / (1000 * 60 * 60 * 24)).toFixed(1);
        console.log(`  ${i+1}. Report ${r.id}: User ${r.user_id}, ${age} days old, ${r.created_at}`);
    });
}

// 2. Check 7-day filter
console.log('\n2. Reports within last 7 days:');
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
console.log('   7-day cutoff:', sevenDaysAgo.toISOString());

const recent = db.prepare('SELECT id, user_id, created_at FROM reports WHERE created_at > ?').all(sevenDaysAgo.toISOString());
console.log('   Count:', recent.length);

if (recent.length > 0) {
    recent.forEach(r => console.log(`     - Report ${r.id}: User ${r.user_id}`));
} else {
    console.log('   ❌ NO REPORTS in last 7 days!');
}

// 3. Check code
console.log('\n3. Code check:');
const fs = require('fs');
const code = fs.readFileSync('/app/dist/routes/reports.js', 'utf8');
console.log('   Has sevenDaysAgo:', code.includes('sevenDaysAgo') ? '✅' : '❌');
console.log('   Has SUPERVISOR:', code.includes('SUPERVISOR') ? '✅' : '❌');

db.close();

console.log('\n=== Summary ===');
console.log('Total:', allReports.length);
console.log('Within 7 days:', recent.length);
console.log('\nIf recent = 0, user CANNOT see any reports (filter working correctly)');
