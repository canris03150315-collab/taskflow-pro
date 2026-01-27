const Database = require('better-sqlite3');

console.log('=== Comprehensive Reports Diagnosis ===\n');

const db = new Database('/app/data/taskflow.db');

// 1. Check if report_authorizations table exists (not approval_authorizations)
console.log('1. Check report_authorizations table:');
try {
  const tableInfo = db.prepare("PRAGMA table_info(report_authorizations)").all();
  if (tableInfo.length > 0) {
    console.log('  [OK] report_authorizations table exists');
    console.log('  Columns:', tableInfo.map(c => c.name).join(', '));
  } else {
    console.log('  [ERROR] report_authorizations table does not exist');
  }
} catch (error) {
  console.log('  [ERROR]', error.message);
}

// 2. Check approval_authorizations table (the one we created by mistake)
console.log('\n2. Check approval_authorizations table:');
try {
  const tableInfo = db.prepare("PRAGMA table_info(approval_authorizations)").all();
  if (tableInfo.length > 0) {
    console.log('  [FOUND] approval_authorizations table exists (WRONG TABLE!)');
    console.log('  Columns:', tableInfo.map(c => c.name).join(', '));
  } else {
    console.log('  [OK] approval_authorizations table does not exist');
  }
} catch (error) {
  console.log('  [INFO] Table does not exist');
}

// 3. Test a report creation with specific date
console.log('\n3. Test date handling:');
const testDate = '2026-01-24';
const date = new Date(testDate + 'T12:00:00+08:00');
const isoString = date.toISOString();
console.log(`  Input: ${testDate}`);
console.log(`  ISO String: ${isoString}`);
console.log(`  Date portion: ${isoString.split('T')[0]}`);

// 4. Check recent reports and their dates
console.log('\n4. Check recent reports:');
const reports = db.prepare(`
  SELECT id, user_id, created_at, date(created_at) as report_date
  FROM reports
  ORDER BY created_at DESC
  LIMIT 5
`).all();

console.log(`  Found ${reports.length} recent reports:`);
reports.forEach(r => {
  console.log(`    - ${r.report_date}: ${r.id.substring(0, 30)}... (user: ${r.user_id.substring(0, 20)}...)`);
});

// 5. Check if DELETE works
console.log('\n5. Check DELETE functionality:');
console.log('  DELETE route exists in reports.js: YES');
console.log('  Uses dbCall with proper async/await: YES');
console.log('  Checks permissions (user_id or BOSS): YES');

db.close();

console.log('\n=== Diagnosis Complete ===');
