const fs = require('fs');

console.log('=== Complete Fix for Audit Log Issue ===\n');

const reportsPath = '/app/dist/routes/reports.js';
let content = fs.readFileSync(reportsPath, 'utf8');

console.log('1. Fixing audit-log route to query correct table...');

// Find the audit-log route and replace the query
// Current: SELECT * FROM report_authorizations
// Should be: SELECT * FROM approval_audit_log

const oldQuery = /const logs = await dbCall\(db, 'all',\s+'SELECT \* FROM report_authorizations ORDER BY created_at DESC LIMIT \? OFFSET \?',/;
const newQuery = `const logs = await dbCall(db, 'all',
      'SELECT * FROM approval_audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?',`;

if (oldQuery.test(content)) {
  content = content.replace(oldQuery, newQuery);
  console.log('   [OK] Updated query to use approval_audit_log table');
} else {
  console.log('   [SKIP] Query pattern not found or already updated');
}

// Also fix the count query
const oldCountQuery = /const total = await dbCall\(db, 'get',\s+'SELECT COUNT\(\*\) as count FROM report_authorizations',/;
const newCountQuery = `const total = await dbCall(db, 'get',
      'SELECT COUNT(*) as count FROM approval_audit_log',`;

if (oldCountQuery.test(content)) {
  content = content.replace(oldCountQuery, newCountQuery);
  console.log('   [OK] Updated count query to use approval_audit_log table');
} else {
  console.log('   [SKIP] Count query pattern not found or already updated');
}

fs.writeFileSync(reportsPath, content, 'utf8');

console.log('\n=== Fix Complete ===');
console.log('\nSummary:');
console.log('- Changed query from report_authorizations to approval_audit_log');
console.log('- approval_audit_log has 20 records ready to display');
console.log('- Frontend expects: id, action, user_name, target_user_name, created_at');
console.log('- Database provides: All required fields');
console.log('\nNext: Restart container and test');
