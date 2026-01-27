const Database = require('better-sqlite3');
const fs = require('fs');

console.log('=== Query All January Backups for Reports ===\n');

const backups = [
  { path: '/tmp/backup-jan22-18.db', name: 'Jan 22 18:00' },
  { path: '/tmp/backup-jan23-18.db', name: 'Jan 23 18:00' },
  { path: '/tmp/backup-jan24-18.db', name: 'Jan 24 18:00' },
  { path: '/tmp/backup-jan25-18.db', name: 'Jan 25 18:00' }
];

const allReports = [];

for (const backup of backups) {
  console.log(`\nChecking: ${backup.name}`);
  
  if (!fs.existsSync(backup.path)) {
    console.log('  [SKIP] File not found');
    continue;
  }
  
  try {
    const db = new Database(backup.path, { readonly: true });
    
    const reports = db.prepare(`
      SELECT 
        id,
        user_id,
        type,
        created_at,
        content,
        date(created_at) as report_date
      FROM reports 
      WHERE date(created_at) BETWEEN '2026-01-22' AND '2026-01-25'
      ORDER BY created_at
    `).all();
    
    db.close();
    
    if (reports.length > 0) {
      console.log(`  [FOUND] ${reports.length} reports in Jan 22-25:`);
      reports.forEach(r => {
        console.log(`    ${r.report_date}: ${r.id.substring(0, 35)}...`);
        
        if (!allReports.find(existing => existing.id === r.id)) {
          allReports.push({
            id: r.id,
            user_id: r.user_id,
            type: r.type,
            created_at: r.created_at,
            content: r.content,
            report_date: r.report_date,
            source: backup.name
          });
        }
      });
    } else {
      console.log('  [EMPTY] No reports in Jan 22-25');
    }
    
  } catch (error) {
    console.log(`  [ERROR] ${error.message}`);
  }
}

console.log('\n=== Summary ===');
console.log(`Total unique reports found: ${allReports.length}`);

if (allReports.length > 0) {
  console.log('\nReports by date:');
  const byDate = {};
  allReports.forEach(r => {
    if (!byDate[r.report_date]) byDate[r.report_date] = [];
    byDate[r.report_date].push(r);
  });
  
  Object.keys(byDate).sort().forEach(date => {
    console.log(`\n${date}: ${byDate[date].length} reports`);
    byDate[date].forEach(r => {
      console.log(`  - ID: ${r.id}`);
      console.log(`    User: ${r.user_id}`);
      console.log(`    Created: ${r.created_at}`);
      console.log(`    Source: ${r.source}`);
    });
  });
  
  fs.writeFileSync('/tmp/reports-to-restore.json', JSON.stringify(allReports, null, 2));
  console.log('\n[SUCCESS] Reports data saved to /tmp/reports-to-restore.json');
  console.log('Ready to create restore script.');
} else {
  console.log('\n[CONCLUSION] No reports exist in backups for Jan 22-25.');
  console.log('This confirms the data was never created.');
}
