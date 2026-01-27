const { execSync } = require('child_process');
const Database = require('better-sqlite3');
const fs = require('fs');

console.log('=== Checking Backups for Reports ===\n');

const backups = [
  { file: 'taskflow-snapshot-v8.9.167-before-audit-log-api-20260122_073300.tar.gz', date: '2026-01-22' },
  { file: 'taskflow-snapshot-v8.9.168-audit-log-api-complete-20260122_073931.tar.gz', date: '2026-01-22' },
  { file: 'taskflow-snapshot-v8.9.169-audit-db-syntax-fix-complete-20260122_103814.tar.gz', date: '2026-01-22' },
  { file: 'taskflow-snapshot-v8.9.169-before-ai-assistant-fix-20260124_134137.tar.gz', date: '2026-01-24' },
  { file: 'taskflow-snapshot-v8.9.170-ai-assistant-fixed-complete-20260124_151701.tar.gz', date: '2026-01-24' }
];

const allReports = [];

for (const backup of backups) {
  console.log(`\nChecking: ${backup.file} (${backup.date})`);
  
  try {
    const extractDir = `/tmp/extract-${Date.now()}`;
    execSync(`mkdir -p ${extractDir}`);
    execSync(`tar -xzf /root/taskflow-snapshots/${backup.file} -C ${extractDir} 2>/dev/null`);
    
    const dbPath = execSync(`find ${extractDir} -name "taskflow.db" -type f`).toString().trim();
    
    if (!dbPath) {
      console.log('  [SKIP] No database found');
      execSync(`rm -rf ${extractDir}`);
      continue;
    }
    
    const db = new Database(dbPath, { readonly: true });
    
    const reports = db.prepare(`
      SELECT 
        id,
        user_id,
        created_at,
        date(created_at) as report_date
      FROM reports 
      WHERE date(created_at) BETWEEN '2026-01-22' AND '2026-01-25'
      ORDER BY created_at
    `).all();
    
    db.close();
    
    if (reports.length > 0) {
      console.log(`  [FOUND] ${reports.length} reports:`);
      reports.forEach(r => {
        console.log(`    ${r.report_date}: ${r.id.substring(0, 30)}...`);
        
        if (!allReports.find(existing => existing.id === r.id)) {
          allReports.push({
            id: r.id,
            user_id: r.user_id,
            created_at: r.created_at,
            report_date: r.report_date,
            source: backup.file
          });
        }
      });
    } else {
      console.log('  [EMPTY] No reports found');
    }
    
    execSync(`rm -rf ${extractDir}`);
    
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
      console.log(`      Source: ${r.source}`);
    });
  });
  
  fs.writeFileSync('/tmp/reports-to-restore.json', JSON.stringify(allReports, null, 2));
  console.log('\n[SUCCESS] Reports data saved to /tmp/reports-to-restore.json');
} else {
  console.log('\n[RESULT] NO REPORTS FOUND in backups for Jan 22-25');
  console.log('This means the data was never created, not lost.');
}
