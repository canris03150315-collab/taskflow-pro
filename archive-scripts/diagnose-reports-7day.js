const Database = require('better-sqlite3');
const path = require('path');

console.log('=== Diagnose Reports 7-Day Issue ===\n');

// Open database
const dbPath = path.join('/app/data', 'taskflow.db');
const db = new Database(dbPath);

console.log('1. Checking all reports in database:\n');
const allReports = db.prepare('SELECT id, user_id, created_at, updated_at FROM reports ORDER BY created_at DESC').all();

console.log(`Total reports: ${allReports.length}\n`);

if (allReports.length > 0) {
    console.log('Recent 10 reports:');
    allReports.slice(0, 10).forEach((r, i) => {
        const createdDate = new Date(r.created_at);
        const now = new Date();
        const daysDiff = (now - createdDate) / (1000 * 60 * 60 * 24);
        console.log(`  ${i+1}. ID: ${r.id}, User: ${r.user_id}, Created: ${r.created_at}, Age: ${daysDiff.toFixed(1)} days`);
    });
}

console.log('\n2. Checking reports within 7 days:\n');
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
const sevenDaysAgoStr = sevenDaysAgo.toISOString();

console.log(`7 days ago: ${sevenDaysAgoStr}`);

const recentReports = db.prepare('SELECT id, user_id, created_at FROM reports WHERE created_at > ? ORDER BY created_at DESC').all(sevenDaysAgoStr);

console.log(`Reports within 7 days: ${recentReports.length}`);
recentReports.forEach((r, i) => {
    console.log(`  ${i+1}. ID: ${r.id}, User: ${r.user_id}, Created: ${r.created_at}`);
});

console.log('\n3. Checking users:\n');
const users = db.prepare('SELECT id, username, role FROM users LIMIT 5').all();
users.forEach(u => {
    console.log(`  User ${u.id}: ${u.username} (${u.role})`);
    const userReports = db.prepare('SELECT COUNT(*) as cnt FROM reports WHERE user_id = ?').get(u.id);
    const userRecent = db.prepare('SELECT COUNT(*) as cnt FROM reports WHERE user_id = ? AND created_at > ?').get(u.id, sevenDaysAgoStr);
    console.log(`    Total reports: ${userReports.cnt}, Within 7 days: ${userRecent.cnt}`);
});

console.log('\n4. Checking GET route in reports.js:\n');
const fs = require('fs');
const reportsJs = fs.readFileSync('/app/dist/routes/reports.js', 'utf8');

if (reportsJs.includes('sevenDaysAgo')) {
    console.log('✅ GET route has 7-day filter code');
} else {
    console.log('❌ GET route does NOT have 7-day filter code');
}

if (reportsJs.includes('SUPERVISOR')) {
    console.log('✅ GET route has SUPERVISOR check');
} else {
    console.log('⚠️  GET route missing SUPERVISOR check');
}

console.log('\n=== Diagnosis Complete ===');

db.close();
