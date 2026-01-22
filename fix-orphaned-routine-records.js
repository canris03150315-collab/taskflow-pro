const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Cleaning up orphaned routine records ===\n');

// Get all templates
const templates = db.prepare('SELECT * FROM routine_templates').all();
const templateDepts = new Set(templates.filter(t => t.is_daily === 1).map(t => t.department_id));

console.log('Daily task departments:', Array.from(templateDepts));

// Get all records
const allRecords = db.prepare('SELECT * FROM routine_records').all();
console.log('Total routine records:', allRecords.length);

// Find orphaned records (records whose department has no daily template)
const orphaned = allRecords.filter(r => !templateDepts.has(r.department_id));

console.log('Orphaned records:', orphaned.length);

if (orphaned.length > 0) {
  console.log('\nOrphaned records to delete:');
  orphaned.forEach(r => {
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(r.user_id);
    console.log(`  - ${user?.name} (${r.department_id}) on ${r.date}`);
  });
  
  // DELETE orphaned records
  const deleteStmt = db.prepare('DELETE FROM routine_records WHERE department_id NOT IN (SELECT department_id FROM routine_templates WHERE is_daily = 1)');
  const result = deleteStmt.run();
  
  console.log(`\n✅ Deleted ${result.changes} orphaned records`);
} else {
  console.log('\n✅ No orphaned records to clean');
}

db.close();
