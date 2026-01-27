const Database = require('better-sqlite3');

console.log('=== Query Single Backup for Reports ===\n');

const db = new Database('/tmp/backup-jan22-18.db', { readonly: true });

console.log('Backup: taskflow_backup_20260122_180001.db (Jan 22, 18:00)\n');

console.log('1. Total reports in backup:');
const total = db.prepare('SELECT COUNT(*) as count FROM reports').get();
console.log(`   ${total.count} reports\n`);

console.log('2. Reports from Jan 22-25:');
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
  console.log(`   [FOUND] ${jan22to25.length} reports:`);
  jan22to25.forEach(r => {
    console.log(`   - ${r.report_date}: ${r.id}`);
  });
} else {
  console.log('   [EMPTY] No reports found\n');
  
  console.log('3. All report dates in backup:');
  const allDates = db.prepare(`
    SELECT 
      date(created_at) as report_date,
      COUNT(*) as count
    FROM reports 
    GROUP BY date(created_at)
    ORDER BY report_date DESC
    LIMIT 10
  `).all();
  
  allDates.forEach(r => {
    console.log(`   ${r.report_date}: ${r.count} reports`);
  });
}

db.close();
