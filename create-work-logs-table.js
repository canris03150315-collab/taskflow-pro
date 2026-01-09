// create-work-logs-table.js
// Create work_logs table in database

const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Creating work_logs table...');

const sql = `
CREATE TABLE IF NOT EXISTS work_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  department_id TEXT NOT NULL,
  date TEXT NOT NULL,
  today_tasks TEXT NOT NULL,
  tomorrow_tasks TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (department_id) REFERENCES departments(id)
);
`;

try {
  db.exec(sql);
  console.log('SUCCESS: work_logs table created');
  
  // Create indexes for better query performance
  db.exec('CREATE INDEX IF NOT EXISTS idx_work_logs_user_date ON work_logs(user_id, date);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_work_logs_dept_date ON work_logs(department_id, date);');
  console.log('SUCCESS: Indexes created');
  
  db.close();
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
