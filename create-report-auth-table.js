// create-report-auth-table.js
// Pure ASCII version - Create report authorization table
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'taskflow.db');
const db = new Database(dbPath);

console.log('Creating report_authorizations table...');

try {
  // Create report authorizations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS report_authorizations (
      id TEXT PRIMARY KEY,
      
      -- First approver
      first_approver_id TEXT NOT NULL,
      first_approver_name TEXT NOT NULL,
      first_approver_dept TEXT NOT NULL,
      first_approved_at TEXT NOT NULL,
      first_approval_reason TEXT NOT NULL,
      first_approval_ip TEXT,
      
      -- Second approver
      second_approver_id TEXT NOT NULL,
      second_approver_name TEXT NOT NULL,
      second_approver_dept TEXT NOT NULL,
      second_approved_at TEXT NOT NULL,
      second_approval_reason TEXT NOT NULL,
      second_approval_ip TEXT,
      
      -- Authorization info
      authorized_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      session_id TEXT NOT NULL,
      
      -- Audit trail
      user_agent TEXT,
      created_at TEXT NOT NULL
    )
  `);
  
  console.log('\u2705 Table created successfully'); // ✅
  
  // Create index for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_report_auth_session 
    ON report_authorizations(session_id);
    
    CREATE INDEX IF NOT EXISTS idx_report_auth_active 
    ON report_authorizations(is_active, expires_at);
  `);
  
  console.log('\u2705 Indexes created successfully'); // ✅
  
} catch (error) {
  console.error('\u274c Error:', error.message); // ❌
  process.exit(1);
}

db.close();
console.log('\u2705 Done'); // ✅
