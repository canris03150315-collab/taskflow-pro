const { execSync } = require('child_process');
const Database = require('better-sqlite3');
const fs = require('fs');

console.log('=== Extract Reports from Backup ===\n');

// List of backup files to check (from Jan 22-25)
const backupFiles = [
  'taskflow-snapshot-v8.9.167-before-audit-log-api-20260122_073300.tar.gz',
  'taskflow-snapshot-v8.9.168-audit-log-api-complete-20260122_073931.tar.gz',
  'taskflow-snapshot-v8.9.168-before-db-syntax-fix-20260122_103420.tar.gz',
  'taskflow-snapshot-v8.9.169-audit-db-syntax-fix-complete-20260122_103814.tar.gz',
  'taskflow-snapshot-v8.9.169-before-ai-assistant-fix-20260124_134137.tar.gz',
  'taskflow-snapshot-v8.9.169-before-ai-conversation-fix-20260124_115918.tar.gz',
  'taskflow-snapshot-v8.9.169-before-complete-ai-fix-20260124_145815.tar.gz',
  'taskflow-snapshot-v8.9.170-ai-assistant-fixed-complete-20260124_151701.tar.gz'
];

const tmpDir = '/tmp/backup-extract';
const resultsFile = '/tmp/reports-found.json';
const allReports = [];

// Create temp directory
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

console.log('Checking backups for reports from 2026-01-22 to 2026-01-25...\n');

for (const backupFile of backupFiles) {
  const backupPath = `/root/taskflow-snapshots/${backupFile}`;
  
  console.log(`\nChecking: ${backupFile}`);
  
  try {
    // Extract database from backup
    const extractDir = `${tmpDir}/${backupFile.replace('.tar.gz', '')}`;
    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir, { recursive: true });
    }
    
    // Extract only the database file
    execSync(`tar -xzf ${backupPath} -C ${extractDir} --strip-components=2 taskflow-data/taskflow.db 2>/dev/null || true`);
    
    const dbPath = `${extractDir}/taskflow.db`;
    
    if (!fs.existsSync(dbPath)) {
      console.log('  [SKIP] No database found in this backup');
      continue;
    }
    
    // Open database and query reports
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
        console.log(`    - ${r.report_date}: ${r.id.substring(0, 25)}...`);
        allReports.push({
          ...r,
          source_backup: backupFile
        });
      });
    } else {
      console.log('  [EMPTY] No reports in this date range');
    }
    
    // Clean up extracted files
    execSync(`rm -rf ${extractDir}`);
    
  } catch (error) {
    console.log(`  [ERROR] ${error.message}`);
  }
}

console.log('\n=== Summary ===');
console.log(`Total reports found: ${allReports.length}`);

if (allReports.length > 0) {
  // Group by date
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
  });
  
  // Save results to file
  fs.writeFileSync(resultsFile, JSON.stringify(allReports, null, 2));
  console.log(`\nResults saved to: ${resultsFile}`);
  console.log('SUCCESS: Reports extraction complete');
} else {
  console.log('\nNO REPORTS FOUND in any backup for Jan 22-25');
}

// Clean up temp directory
execSync(`rm -rf ${tmpDir}`);
