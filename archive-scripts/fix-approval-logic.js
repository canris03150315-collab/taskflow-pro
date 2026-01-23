// fix-approval-logic.js
// Fix the approval logic - add requester_id column
const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Fixing Approval Logic ===\n');

// Check if requester_id column exists
const tableInfo = db.prepare("PRAGMA table_info(report_authorizations)").all();
const hasRequesterId = tableInfo.some(col => col.name === 'requester_id');

if (!hasRequesterId) {
  console.log('Adding requester_id column...');
  
  // Add requester_id column (the person who requested to view reports)
  db.prepare(`
    ALTER TABLE report_authorizations 
    ADD COLUMN requester_id TEXT
  `).run();
  
  console.log('✅ Added requester_id column');
  
  // Migrate existing data: requester is the first approver
  const count = db.prepare(`
    UPDATE report_authorizations 
    SET requester_id = first_approver_id
    WHERE requester_id IS NULL
  `).run();
  
  console.log(`✅ Migrated ${count.changes} existing records`);
} else {
  console.log('requester_id column already exists');
}

console.log('\n=== Current table structure ===');
const newTableInfo = db.prepare("PRAGMA table_info(report_authorizations)").all();
newTableInfo.forEach(col => {
  console.log(`- ${col.name} (${col.type})`);
});

db.close();
console.log('\n✅ Fix Complete');
