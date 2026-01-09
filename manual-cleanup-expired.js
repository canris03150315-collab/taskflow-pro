const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Manual Cleanup Expired Authorizations ===\n');

try {
  // Find expired authorizations
  const expired = db.prepare(`
    SELECT id, requester_id, expires_at
    FROM report_authorizations
    WHERE is_active = 1
      AND datetime(expires_at) <= datetime('now')
  `).all();

  console.log('Found', expired.length, 'expired authorizations');

  if (expired.length > 0) {
    // Delete expired authorizations
    const result = db.prepare(`
      DELETE FROM report_authorizations
      WHERE is_active = 1
        AND datetime(expires_at) <= datetime('now')
    `).run();

    console.log('Deleted', result.changes, 'expired authorizations');
    console.log('[APPROVAL-CLEANUP] Manual cleanup completed');
  } else {
    console.log('No expired authorizations to clean up');
  }

  // Show remaining active authorizations
  const active = db.prepare(`
    SELECT COUNT(*) as count
    FROM report_authorizations
    WHERE is_active = 1
  `).get();

  console.log('\nRemaining active authorizations:', active.count);

} catch (error) {
  console.error('[APPROVAL-CLEANUP-ERROR]', error);
}

db.close();
console.log('\n=== Cleanup Complete ===');
