const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Report Approval System Health Check ===\n');

let issues = [];
let warnings = [];

// 1. Check for duplicate active authorizations
console.log('1. Checking for duplicate active authorizations...');
const duplicateActive = db.prepare(`
  SELECT requester_id, COUNT(*) as count
  FROM report_authorizations
  WHERE is_active = 1
  GROUP BY requester_id
  HAVING count > 1
`).all();

if (duplicateActive.length > 0) {
  issues.push('CRITICAL: Found users with multiple active authorizations');
  duplicateActive.forEach(dup => {
    console.log('  ERROR: User', dup.requester_id, 'has', dup.count, 'active authorizations');
  });
} else {
  console.log('  OK: No duplicate active authorizations');
}

// 2. Check for expired active authorizations
console.log('\n2. Checking for expired active authorizations...');
const expiredActive = db.prepare(`
  SELECT id, requester_id, expires_at
  FROM report_authorizations
  WHERE is_active = 1 
    AND datetime(expires_at) <= datetime('now')
`).all();

if (expiredActive.length > 0) {
  warnings.push('WARNING: Found expired authorizations still marked as active');
  expiredActive.forEach(auth => {
    console.log('  WARNING: Authorization', auth.id, 'expired at', auth.expires_at);
  });
} else {
  console.log('  OK: No expired active authorizations');
}

// 3. Check for orphaned pending approvals
console.log('\n3. Checking for orphaned pending approvals...');
const orphanedPending = db.prepare(`
  SELECT ra.id, ra.requester_id, ra.first_approver_id
  FROM report_authorizations ra
  LEFT JOIN users u1 ON ra.requester_id = u1.id
  LEFT JOIN users u2 ON ra.first_approver_id = u2.id
  WHERE ra.is_active = 0 
    AND ra.first_approved_at = ''
    AND (u1.id IS NULL OR u2.id IS NULL)
`).all();

if (orphanedPending.length > 0) {
  warnings.push('WARNING: Found pending approvals with deleted users');
  orphanedPending.forEach(auth => {
    console.log('  WARNING: Authorization', auth.id, 'has deleted user');
  });
} else {
  console.log('  OK: No orphaned pending approvals');
}

// 4. Check for very old pending approvals (>7 days)
console.log('\n4. Checking for stale pending approvals...');
const stalePending = db.prepare(`
  SELECT id, requester_id, created_at
  FROM report_authorizations
  WHERE is_active = 0 
    AND first_approved_at = ''
    AND datetime(created_at) < datetime('now', '-7 days')
`).all();

if (stalePending.length > 0) {
  warnings.push('WARNING: Found pending approvals older than 7 days');
  stalePending.forEach(auth => {
    console.log('  WARNING: Authorization', auth.id, 'pending since', auth.created_at);
  });
} else {
  console.log('  OK: No stale pending approvals');
}

// 5. Check for self-approval attempts
console.log('\n5. Checking for self-approval attempts...');
const selfApproval = db.prepare(`
  SELECT id, requester_id, first_approver_id
  FROM report_authorizations
  WHERE requester_id = first_approver_id
`).all();

if (selfApproval.length > 0) {
  issues.push('CRITICAL: Found self-approval attempts');
  selfApproval.forEach(auth => {
    console.log('  ERROR: Authorization', auth.id, 'has same requester and approver');
  });
} else {
  console.log('  OK: No self-approval attempts');
}

// 6. Statistics
console.log('\n6. System Statistics:');
const stats = {
  totalAuths: db.prepare('SELECT COUNT(*) as count FROM report_authorizations').get().count,
  activeAuths: db.prepare("SELECT COUNT(*) as count FROM report_authorizations WHERE is_active = 1").get().count,
  pendingAuths: db.prepare("SELECT COUNT(*) as count FROM report_authorizations WHERE is_active = 0 AND first_approved_at = ''").get().count,
  approvedAuths: db.prepare("SELECT COUNT(*) as count FROM report_authorizations WHERE first_approved_at != ''").get().count
};

console.log('  Total authorizations:', stats.totalAuths);
console.log('  Active authorizations:', stats.activeAuths);
console.log('  Pending approvals:', stats.pendingAuths);
console.log('  Approved (all time):', stats.approvedAuths);

// 7. Summary
console.log('\n=== Health Check Summary ===');
if (issues.length === 0 && warnings.length === 0) {
  console.log('STATUS: HEALTHY - No issues found');
} else {
  if (issues.length > 0) {
    console.log('STATUS: CRITICAL - Found', issues.length, 'critical issues');
    issues.forEach(issue => console.log('  -', issue));
  }
  if (warnings.length > 0) {
    console.log('STATUS: WARNING - Found', warnings.length, 'warnings');
    warnings.forEach(warning => console.log('  -', warning));
  }
}

db.close();
console.log('\n=== Health Check Complete ===');
