const Database = require('better-sqlite3');
const fs = require('fs');

console.log('=== Query Daily Backups for Reports ===\n');

const backups = [
  // Jan 22
  '/root/taskflow-backups/taskflow_backup_20260122_000001.db',
  '/root/taskflow-backups/taskflow_backup_20260122_060001.db',
  '/root/taskflow-backups/taskflow_backup_20260122_120001.db',
  '/root/taskflow-backups/taskflow_backup_20260122_180001.db',
  // Jan 23
  '/root/taskflow-backups/taskflow_backup_20260123_000001.db',
  '/root/taskflow-backups/taskflow_backup_20260123_060001.db',
  '/root/taskflow-backups/taskflow_backup_20260123_120001.db',
  '/root/taskflow-backups/taskflow_backup_20260123_180001.db',
  // Jan 24
  '/root/taskflow-backups/taskflow_backup_20260124_000001.db',
  '/root/taskflow-backups/taskflow_backup_20260124_060001.db',
  '/root/taskflow-backups/taskflow_backup_20260124_120002.db',
  '/root/taskflow-backups/taskflow_backup_20260124_180001.db',
  // Jan 25
  '/root/taskflow-backups/taskflow_backup_20260125_000001.db',
  '/root/taskflow-backups/taskflow_backup_20260125_060001.db',
  '/root/taskflow-backups/taskflow_backup_20260125_120001.db',
  '/root/taskflow-backups/taskflow_backup_20260125_180001.db'
];

const allReports = [];

for (const backupPath of backups) {
  const backupName = backupPath.split('/').pop();
  console.log(`\nChecking: ${backupName}`);
  
  if (!fs.existsSync(backupPath)) {
    console.log('  [SKIP] File not found');
    continue;
  }
  
  try {
    const db = new Database(backupPath, { readonly: true });
    
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
      console.log(`  [FOUND] ${reports.length} reports`);
      reports.forEach(r => {
        console.log(`    - ${r.report_date}: ${r.id.substring(0, 30)}...`);
        
        if (!allReports.find(existing => existing.id === r.id)) {
          allReports.push({
            id: r.id,
            user_id: r.user_id,
            type: r.type,
            created_at: r.created_at,
            content: r.content,
            report_date: r.report_date,
            source: backupName
          });
        }
      });
    } else {
      console.log('  [EMPTY] No reports in date range');
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
    console.log(`\n  ${date}: ${byDate[date].length} reports`);
    byDate[date].forEach(r => {
      console.log(`    - ID: ${r.id}`);
      console.log(`      User: ${r.user_id}`);
      console.log(`      Created: ${r.created_at}`);
      console.log(`      Source: ${r.source}`);
    });
  });
  
  fs.writeFileSync('/tmp/reports-to-restore.json', JSON.stringify(allReports, null, 2));
  console.log('\n[SUCCESS] Found reports! Data saved to /tmp/reports-to-restore.json');
  console.log('Ready to restore these reports to current database.');
} else {
  console.log('\n[RESULT] NO REPORTS FOUND in any backup for Jan 22-25');
}
