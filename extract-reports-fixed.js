const { execSync } = require('child_process');
const Database = require('better-sqlite3');
const fs = require('fs');

console.log('=== Extract Reports from Backup ===\n');

const backupFiles = [
  'taskflow-snapshot-v8.9.167-before-audit-log-api-20260122_073300.tar.gz',
  'taskflow-snapshot-v8.9.168-audit-log-api-complete-20260122_073931.tar.gz',
  'taskflow-snapshot-v8.9.169-audit-db-syntax-fix-complete-20260122_103814.tar.gz',
  'taskflow-snapshot-v8.9.169-before-ai-assistant-fix-20260124_134137.tar.gz',
  'taskflow-snapshot-v8.9.170-ai-assistant-fixed-complete-20260124_151701.tar.gz'
];

const tmpDir = '/tmp/backup-extract';
const allReports = [];

if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

console.log('Checking backups for reports from 2026-01-22 to 2026-01-25...\n');

for (const backupFile of backupFiles) {
  const backupPath = `/root/taskflow-snapshots/${backupFile}`;
  
  console.log(`Checking: ${backupFile}`);
  
  try {
    const extractDir = `${tmpDir}/${backupFile.replace('.tar.gz', '')}`;
    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir, { recursive: true });
    }
    
    // Extract the entire backup
    execSync(`tar -xzf ${backupPath} -C ${extractDir} 2>/dev/null`);
    
    // Find the database file
    const files = execSync(`find ${extractDir} -name "taskflow.db" -type f`).toString().trim().split('\n');
    
    if (files.length === 0 || !files[0]) {
      console.log('  [SKIP] No database found');
      execSync(`rm -rf ${extractDir}`);
      continue;
    }
    
    const dbPath = files[0];
    console.log(`  [DB] Found at: ${dbPath}`);
    
    const db = new Database(dbPath, { readonly: true });
    
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
      console.log(`  [FOUND] ${reports.length} reports:`);
      reports.forEach(r => {
        console.log(`    - ${r.report_date}: ${r.id.substring(0, 25)}... (user: ${r.user_id.substring(0, 15)}...)`);
        
        // Check if this report already exists in our list
        const exists = allReports.find(existing => existing.id === r.id);
        if (!exists) {
          allReports.push({
            ...r,
            source_backup: backupFile
          });
        }
      });
    } else {
      console.log('  [EMPTY] No reports in this date range');
    }
    
    execSync(`rm -rf ${extractDir}`);
    
  } catch (error) {
    console.log(`  [ERROR] ${error.message}`);
  }
}

console.log('\n=== Summary ===');
console.log(`Total unique reports found: ${allReports.length}`);

if (allReports.length > 0) {
  const byDate = {};
  allReports.forEach(r => {
    if (!byDate[r.report_date]) {
      byDate[r.report_date] = [];
    }
    byDate[r.report_date].push(r);
  });
  
  console.log('\nReports by date:');
  Object.keys(byDate).sort().forEach(date => {
    console.log(`  ${date}: ${byDate[date].length} reports`);
    byDate[date].forEach(r => {
      console.log(`    - ID: ${r.id}`);
      console.log(`      User: ${r.user_id}`);
      console.log(`      Source: ${r.source_backup}`);
    });
  });
  
  fs.writeFileSync('/tmp/reports-found.json', JSON.stringify(allReports, null, 2));
  console.log(`\nResults saved to: /tmp/reports-found.json`);
  console.log('SUCCESS: Reports extraction complete');
} else {
  console.log('\nNO REPORTS FOUND in any backup for Jan 22-25');
}

execSync(`rm -rf ${tmpDir}`);
