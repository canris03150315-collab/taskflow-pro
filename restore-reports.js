const Database = require('better-sqlite3');
const fs = require('fs');

console.log('=== Restore Reports from Backup ===\n');

// Read the reports data
const reportsData = JSON.parse(fs.readFileSync('/tmp/reports-to-restore.json', 'utf8'));

console.log(`Found ${reportsData.length} reports to restore\n`);

// Open current database
const db = new Database('/app/data/taskflow.db');

let restored = 0;
let skipped = 0;

for (const report of reportsData) {
  console.log(`Processing: ${report.id} (${report.report_date})`);
  
  // Check if report already exists
  const existing = db.prepare('SELECT id FROM reports WHERE id = ?').get(report.id);
  
  if (existing) {
    console.log('  [SKIP] Report already exists');
    skipped++;
    continue;
  }
  
  try {
    // Insert report
    db.prepare(`
      INSERT INTO reports (id, type, user_id, created_at, content)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      report.id,
      report.type,
      report.user_id,
      report.created_at,
      report.content
    );
    
    console.log('  [OK] Report restored');
    restored++;
    
  } catch (error) {
    console.log(`  [ERROR] ${error.message}`);
  }
}

db.close();

console.log('\n=== Restore Complete ===');
console.log(`Restored: ${restored} reports`);
console.log(`Skipped: ${skipped} reports (already exist)`);
console.log(`Total: ${reportsData.length} reports`);

if (restored > 0) {
  console.log('\nSUCCESS: Reports have been restored to the database');
} else {
  console.log('\nINFO: No new reports were added');
}
