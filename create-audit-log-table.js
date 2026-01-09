const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Creating Approval Audit Log Table ===\n');

// Create audit log table
const createTableSQL = `
CREATE TABLE IF NOT EXISTS approval_audit_log (
  id TEXT PRIMARY KEY,
  authorization_id TEXT,
  action TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT,
  user_dept TEXT,
  target_user_id TEXT,
  target_user_name TEXT,
  reason TEXT,
  created_at TEXT NOT NULL,
  metadata TEXT
)`;

try {
  db.exec(createTableSQL);
  console.log('SUCCESS: approval_audit_log table created');
  
  // Verify table exists
  const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='approval_audit_log'").get();
  if (tableInfo) {
    console.log('VERIFIED: Table exists');
    
    // Show table structure
    const columns = db.prepare("PRAGMA table_info(approval_audit_log)").all();
    console.log('\nTable structure:');
    columns.forEach(col => {
      console.log('  -', col.name, ':', col.type);
    });
  }
} catch (error) {
  console.error('ERROR:', error.message);
}

db.close();
console.log('\n=== Table Creation Complete ===');
