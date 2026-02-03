const Database = require('better-sqlite3');
const fs = require('fs');

console.log('=== Operating Report Authorization Diagnosis ===\n');

const db = new Database('/app/data/taskflow.db');

// 1. Check authorization table structure (from previous output)
console.log('1. Authorization Table has these columns:');
console.log('   - requester_id, first_approver_id, second_approver_id');
console.log('   - authorized_at, expires_at, is_active');
console.log('   - session_id, created_at');

// 2. Check current authorization records
console.log('\n2. Current Authorization Records:');
const auths = db.prepare(`
  SELECT COUNT(*) as count FROM report_authorizations
`).get();
console.log(`   Total: ${auths.count} authorization records`);

const activeAuths = db.prepare(`
  SELECT COUNT(*) as count FROM report_authorizations WHERE is_active = 1
`).get();
console.log(`   Active: ${activeAuths.count} authorizations`);

// 3. Check report data
console.log('\n3. Report Data:');
const totalReports = db.prepare(`
  SELECT COUNT(*) as count FROM reports
`).get();
console.log(`   Total: ${totalReports.count} reports in database`);

// Calculate reports within one week
const oneWeekAgo = new Date();
oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
const oneWeekAgoStr = oneWeekAgo.toISOString();

const recentReports = db.prepare(`
  SELECT COUNT(*) as count 
  FROM reports 
  WHERE created_at > ?
`).get(oneWeekAgoStr);
console.log(`   Reports in last 7 days: ${recentReports.count}`);

// Get sample recent reports
const sampleRecent = db.prepare(`
  SELECT id, user_id, type, created_at 
  FROM reports 
  WHERE created_at > ?
  ORDER BY created_at DESC 
  LIMIT 5
`).all(oneWeekAgoStr);

if (sampleRecent.length > 0) {
  console.log('\n   Sample Recent Reports:');
  sampleRecent.forEach(r => {
    const createdDate = new Date(r.created_at);
    const daysAgo = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24));
    console.log(`   - ${r.id.substring(0, 8)}... (${daysAgo} days ago, user: ${r.user_id.substring(0, 10)}...)`);
  });
}

db.close();

console.log('\n=== Current Issue ===');
console.log('Employees cannot verify their own reports after submission');
console.log('They need dual authorization even to view their own recent reports');

console.log('\n=== Proposed Solution ===');
console.log('Allow employees to view their OWN reports within 7 days without authorization');
console.log('');
console.log('Implementation:');
console.log('1. Frontend: Skip authorization check for own reports < 7 days old');
console.log('2. Backend: Allow GET /api/reports to return own reports < 7 days');
console.log('3. Keep authorization for:');
console.log('   - Reports older than 7 days');
console.log('   - Viewing OTHER people\'s reports');
console.log('   - BOSS/MANAGER can always view all reports');
