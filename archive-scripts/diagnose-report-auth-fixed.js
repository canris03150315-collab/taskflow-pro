const Database = require('better-sqlite3');
const fs = require('fs');

console.log('=== Operating Report Authorization Diagnosis ===\n');

const db = new Database('/app/data/taskflow.db');

// 1. Check report_authorizations table structure
console.log('1. Authorization Table Structure:');
const tableInfo = db.prepare('PRAGMA table_info(report_authorizations)').all();
tableInfo.forEach(col => {
  console.log(`   ${col.name} (${col.type})`);
});

// 2. Check current authorization records
console.log('\n2. Current Authorization Records:');
const auths = db.prepare(`
  SELECT id, requester_id, first_approver_id, second_approver_id, 
         status, created_at, expires_at 
  FROM report_authorizations 
  ORDER BY created_at DESC 
  LIMIT 5
`).all();
console.log(`   Total: ${auths.length} records`);
auths.forEach(auth => {
  console.log(`   - ID: ${auth.id}`);
  console.log(`     Status: ${auth.status}`);
  console.log(`     Expires: ${auth.expires_at}`);
});

// 3. Check report data
console.log('\n3. Report Data:');
const reports = db.prepare(`
  SELECT id, user_id, type, created_at 
  FROM reports 
  ORDER BY created_at DESC 
  LIMIT 10
`).all();
console.log(`   Total: ${reports.length} reports`);

// Calculate reports within one week
const oneWeekAgo = new Date();
oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
const oneWeekAgoStr = oneWeekAgo.toISOString();
const recentReports = reports.filter(r => r.created_at > oneWeekAgoStr);
console.log(`   Reports in last 7 days: ${recentReports.length}`);

if (recentReports.length > 0) {
  console.log('\n   Recent Reports:');
  recentReports.forEach(r => {
    const daysAgo = Math.floor((new Date() - new Date(r.created_at)) / (1000 * 60 * 60 * 24));
    console.log(`   - ${r.id} (${daysAgo} days ago)`);
  });
}

// 4. Check backend route logic
console.log('\n4. Backend Route Check:');
const reportsJs = fs.readFileSync('/app/dist/routes/reports.js', 'utf8');
const hasAuthCheck = reportsJs.includes('reportApprovalRoutes');
console.log(`   Uses approval routes: ${hasAuthCheck ? 'YES' : 'NO'}`);

const approvalJs = fs.readFileSync('/app/dist/routes/report-approval-routes.js', 'utf8');
const hasStatusCheck = approvalJs.includes('approval/status');
console.log(`   Has status check endpoint: ${hasStatusCheck ? 'YES' : 'NO'}`);

db.close();

console.log('\n=== Diagnosis Complete ===');
console.log('\n--- PROPOSED SOLUTION ---');
console.log('Option 1: Allow authors to view their own reports within 7 days');
console.log('  - Modify GET /api/reports to check report creation date');
console.log('  - If report < 7 days old, author can view directly');
console.log('  - If report > 7 days old, still requires dual authorization');
console.log('  - BOSS and MANAGER can always view all reports');
console.log('\nOption 2: Disable authorization check for recent reports');
console.log('  - Frontend skips authorization modal for reports < 7 days');
console.log('  - Backend allows direct access for own reports < 7 days');
