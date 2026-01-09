const Database = require('better-sqlite3');

console.log('Creating schedules tables...\n');

try {
  const db = new Database('/app/data/taskflow.db');
  
  // 1. Create schedules table
  console.log('Creating schedules table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      department_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      selected_days TEXT NOT NULL,
      total_days INTEGER NOT NULL,
      status TEXT DEFAULT 'PENDING',
      submitted_at TEXT NOT NULL,
      reviewed_by TEXT,
      reviewed_at TEXT,
      review_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (department_id) REFERENCES departments(id)
    )
  `);
  console.log('OK schedules table created');

  // 2. Create schedule_rules table
  console.log('Creating schedule_rules table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedule_rules (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL UNIQUE,
      max_days_per_month INTEGER DEFAULT 8,
      submission_deadline INTEGER DEFAULT 25,
      min_on_duty_staff INTEGER DEFAULT 3,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (department_id) REFERENCES departments(id)
    )
  `);
  console.log('OK schedule_rules table created');

  // 3. Create indexes
  console.log('Creating indexes...');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_schedules_user ON schedules(user_id);
    CREATE INDEX IF NOT EXISTS idx_schedules_dept ON schedules(department_id);
    CREATE INDEX IF NOT EXISTS idx_schedules_month ON schedules(year, month);
    CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status);
  `);
  console.log('OK indexes created');

  db.close();
  console.log('\nOK All schedules tables created successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
