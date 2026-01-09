const Database = require('better-sqlite3');
const path = require('path');

console.log('Initializing leave system database tables...\n');

try {
  const db = new Database('/app/data/taskflow.db');
  
  // Leave requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      department_id TEXT NOT NULL,
      leave_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      start_period TEXT DEFAULT 'FULL',
      end_period TEXT DEFAULT 'FULL',
      days REAL NOT NULL,
      hours REAL,
      reason TEXT,
      attachment TEXT,
      status TEXT DEFAULT 'PENDING',
      has_conflict INTEGER DEFAULT 0,
      conflict_details TEXT,
      conflict_override INTEGER DEFAULT 0,
      approver_id TEXT,
      approval_notes TEXT,
      approved_at TEXT,
      proxy_user_id TEXT,
      batch_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  console.log('Created leave_requests table');
  
  // Leave quotas table
  db.exec(`
    CREATE TABLE IF NOT EXISTS leave_quotas (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      leave_type TEXT NOT NULL,
      year INTEGER NOT NULL,
      total_days REAL NOT NULL,
      used_days REAL DEFAULT 0,
      pending_days REAL DEFAULT 0,
      remaining_days REAL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, leave_type, year)
    )
  `);
  console.log('Created leave_quotas table');
  
  // Department leave rules table
  db.exec(`
    CREATE TABLE IF NOT EXISTS department_leave_rules (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
      max_concurrent_leaves INTEGER DEFAULT 2,
      min_on_duty_staff INTEGER DEFAULT 3,
      require_critical_staff INTEGER DEFAULT 1,
      min_critical_staff INTEGER DEFAULT 1,
      min_advance_days INTEGER DEFAULT 3,
      max_consecutive_days INTEGER DEFAULT 14,
      min_leave_unit TEXT DEFAULT 'DAY',
      blackout_dates TEXT,
      restricted_dates TEXT,
      priority_dates TEXT,
      critical_positions TEXT,
      leave_type_rules TEXT,
      auto_approve_no_conflict INTEGER DEFAULT 0,
      require_proxy INTEGER DEFAULT 0,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(department_id)
    )
  `);
  console.log('Created department_leave_rules table');
  
  // Leave notifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS leave_notifications (
      id TEXT PRIMARY KEY,
      leave_request_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      priority TEXT DEFAULT 'NORMAL',
      message TEXT NOT NULL,
      action_required INTEGER DEFAULT 0,
      read INTEGER DEFAULT 0,
      read_at TEXT,
      created_at TEXT NOT NULL
    )
  `);
  console.log('Created leave_notifications table');
  
  // Leave batches table
  db.exec(`
    CREATE TABLE IF NOT EXISTS leave_batches (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
      approver_id TEXT NOT NULL,
      total_requests INTEGER DEFAULT 0,
      approved_requests INTEGER DEFAULT 0,
      rejected_requests INTEGER DEFAULT 0,
      status TEXT DEFAULT 'PENDING',
      created_at TEXT NOT NULL,
      completed_at TEXT
    )
  `);
  console.log('Created leave_batches table');
  
  // Create indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON leave_requests(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_leave_requests_dept ON leave_requests(department_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_leave_quotas_user ON leave_quotas(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_leave_notifications_user ON leave_notifications(user_id)`);
  console.log('Created indexes');
  
  db.close();
  console.log('\nLeave system database tables initialized successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
