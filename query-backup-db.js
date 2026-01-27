const Database = require('better-sqlite3');

console.log('=== Query Backup Database for Reports ===\n');

const db = new Database('/tmp/backup-jan22.db', { readonly: true });

console.log('1. Check reports table structure:');
const tableInfo = db.prepare("PRAGMA table_info(reports)").all();
console.log('Columns:', tableInfo.map(c => c.name).join(', '));
console.log('');

console.log('2. Count all reports:');
const totalCount = db.prepare('SELECT COUNT(*) as count FROM reports').get();
console.log(`Total reports in backup: ${totalCount.count}`);
console.log('');

console.log('3. Check reports from Jan 22-25:');
const jan22to25 = db.prepare(`
  SELECT 
    id,
    user_id,
    created_at,
    date(created_at) as report_date
  FROM reports 
  WHERE date(created_at) BETWEEN '2026-01-22' AND '2026-01-25'
  ORDER BY created_at
`).all();

if (jan22to25.length > 0) {
  console.log(`[FOUND] ${jan22to25.length} reports in Jan 22-25:`);
  jan22to25.forEach(r => {
    console.log(`  - ${r.report_date}: ${r.id}`);
    console.log(`    User: ${r.user_id}`);
    console.log(`    Created: ${r.created_at}`);
  });
} else {
  console.log('[EMPTY] No reports found in Jan 22-25');
}
console.log('');

console.log('4. Check all report dates:');
const allDates = db.prepare(`
  SELECT 
    date(created_at) as report_date,
    COUNT(*) as count
  FROM reports 
  GROUP BY date(created_at)
  ORDER BY report_date DESC
  LIMIT 20
`).all();

console.log('Recent report dates:');
allDates.forEach(r => {
  console.log(`  ${r.report_date}: ${r.count} reports`);
});

db.close();
console.log('\n=== Query Complete ===');
