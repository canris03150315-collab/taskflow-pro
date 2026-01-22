const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Testing Reports Approval Routes ===\n');

// 1. Check if report_authorizations table exists
try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='report_authorizations'").all();
  console.log('1. report_authorizations table:', tables.length > 0 ? 'EXISTS' : 'NOT EXISTS');
} catch (e) {
  console.log('1. Error checking table:', e.message);
}

// 2. Check if reports.js exports reportRoutes
try {
  const reports = require('/app/dist/routes/reports');
  console.log('2. reports.js module loaded:', 'YES');
  console.log('   - reportRoutes export:', typeof reports.reportRoutes);
  console.log('   - Is function/router:', typeof reports.reportRoutes === 'function' ? 'YES' : 'NO');
} catch (e) {
  console.log('2. Error loading reports.js:', e.message);
}

// 3. Test database connection
try {
  const count = db.prepare('SELECT COUNT(*) as count FROM reports').get();
  console.log('3. Reports count in DB:', count.count);
} catch (e) {
  console.log('3. Error querying reports:', e.message);
}

db.close();
console.log('\n=== Test Complete ===');
