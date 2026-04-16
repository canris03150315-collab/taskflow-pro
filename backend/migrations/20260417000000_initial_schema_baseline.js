/**
 * Migration 001: Initial schema baseline
 *
 * Created: 2026-04-17
 *
 * This migration captures the complete schema as it existed BEFORE Knex
 * was introduced. All statements use `CREATE TABLE IF NOT EXISTS` and
 * `CREATE INDEX IF NOT EXISTS` so this is safe to run on:
 *   - Fresh databases (creates everything)
 *   - Existing databases (no-op, schema already there)
 *
 * On the 4 production servers, running this migration is a no-op because
 * the tables already exist. Knex marks it as completed so future migrations
 * proceed normally.
 *
 * Future schema changes should NEVER edit this file. Create a new
 * migration with `npx knex migrate:make <name>` instead.
 */

const RAW_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('BOSS', 'MANAGER', 'SUPERVISOR', 'EMPLOYEE')),
  department TEXT NOT NULL,
  avatar TEXT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  permissions TEXT,
  exclude_from_attendance INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  theme TEXT NOT NULL CHECK (theme IN ('slate', 'blue', 'purple', 'rose', 'emerald', 'orange', 'cyan')),
  icon TEXT NOT NULL,
  parent_department_id TEXT REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  urgency TEXT NOT NULL CHECK (urgency IN ('Low', 'Medium', 'High', 'Critical', 'low', 'medium', 'high', 'urgent', '低', '中', '高', '緊急')),
  deadline DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT '待接取' CHECK (status IN ('Open', 'Assigned', 'In Progress', 'Completed', 'Cancelled', '待接取', '已指派', '進行中', '已完成', '已取消')),
  target_department TEXT,
  assigned_to_user_id TEXT,
  assigned_to_department TEXT,
  accepted_by_user_id TEXT,
  completion_notes TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_by TEXT NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE,
  last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  version INTEGER DEFAULT 1,
  offline_pending BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS task_timeline (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  progress INTEGER NOT NULL,
  is_offline BOOLEAN DEFAULT FALSE,
  synced_at DATETIME,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  data TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'IMPORTANT')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL,
  read_by TEXT,
  updated_at DATETIME,
  images TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  clock_in DATETIME NOT NULL,
  clock_out DATETIME,
  duration_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'ONLINE' CHECK (status IN ('ONLINE', 'OFFLINE')),
  location_lat REAL,
  location_lng REAL,
  location_address TEXT,
  is_offline BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  work_hours REAL,
  is_manual BOOLEAN DEFAULT 0,
  manual_by TEXT,
  manual_reason TEXT,
  manual_at DATETIME
);

CREATE TABLE IF NOT EXISTS system_logs (
  id TEXT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'INFO' CHECK (level IN ('INFO', 'WARNING', 'DANGER'))
);

CREATE TABLE IF NOT EXISTS finance_records (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  status TEXT NOT NULL DEFAULT 'PENDING',
  category TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  scope TEXT NOT NULL DEFAULT 'DEPARTMENT',
  department_id TEXT,
  user_id TEXT,
  owner_id TEXT,
  recorded_by TEXT,
  confirmed_by TEXT,
  confirmed_at DATETIME,
  attachment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  message TEXT NOT NULL,
  intent TEXT,
  action_taken TEXT,
  action_result TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS routine_templates (
  id TEXT PRIMARY KEY,
  department_id TEXT,
  title TEXT NOT NULL,
  items TEXT DEFAULT '[]',
  last_updated TEXT,
  is_daily INTEGER DEFAULT 0,
  read_by TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS routine_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  department_id TEXT,
  date TEXT NOT NULL,
  template_id TEXT,
  items TEXT DEFAULT '[]',
  completed INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kol_profiles (
  id TEXT PRIMARY KEY,
  platform TEXT DEFAULT 'FACEBOOK',
  platform_id TEXT,
  facebook_id TEXT,
  platform_account TEXT,
  contact_info TEXT,
  status TEXT DEFAULT 'ACTIVE',
  status_color TEXT DEFAULT 'green',
  weekly_pay_note TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  department_id TEXT
);

CREATE TABLE IF NOT EXISTS kol_weekly_payments (
  id TEXT PRIMARY KEY,
  kol_id TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_date TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'DAILY',
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,
  content TEXT,
  ai_summary TEXT,
  ai_mood TEXT,
  manager_feedback TEXT,
  reviewed_by TEXT
);

CREATE TABLE IF NOT EXISTS suggestions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  is_anonymous INTEGER DEFAULT 0,
  author_id TEXT NOT NULL,
  target_dept_id TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  upvotes TEXT DEFAULT '[]',
  comments TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status_changed_by TEXT,
  status_changed_at DATETIME
);

CREATE TABLE IF NOT EXISTS memos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'TEXT',
  content TEXT,
  todos TEXT,
  color TEXT NOT NULL DEFAULT '#fef3c7',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS work_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  department_id TEXT,
  date TEXT NOT NULL,
  today_tasks TEXT,
  tomorrow_tasks TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  department_id TEXT,
  leave_type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  start_period TEXT DEFAULT 'FULL',
  end_period TEXT DEFAULT 'FULL',
  days REAL NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  has_conflict INTEGER DEFAULT 0,
  conflict_details TEXT,
  proxy_user_id TEXT,
  approver_id TEXT,
  approval_notes TEXT,
  conflict_override INTEGER DEFAULT 0,
  approved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS department_leave_rules (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL,
  max_concurrent_leaves INTEGER DEFAULT 2,
  min_on_duty_staff INTEGER DEFAULT 3,
  min_advance_days INTEGER DEFAULT 3,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  department_id TEXT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  selected_days TEXT DEFAULT '[]',
  total_days INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  has_conflict INTEGER DEFAULT 0,
  conflict_details TEXT,
  reviewed_by TEXT,
  reviewed_at DATETIME,
  review_notes TEXT,
  submitted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedule_rules (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL,
  max_days_per_month INTEGER DEFAULT 8,
  submission_deadline INTEGER DEFAULT 25,
  min_on_duty_staff INTEGER DEFAULT 3,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approval_audit_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  target_id TEXT,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_user_memory (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  learned_from TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_conversation_summaries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  message_count INTEGER DEFAULT 0,
  period_start TEXT,
  period_end TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_pending_actions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  actions TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_channels (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('DIRECT', 'GROUP')),
  name TEXT,
  participants TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  read_by TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS platform_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'manager' CHECK (type IN ('manager', 'merchant', 'dividend', 'other')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_daily_records (
  id TEXT PRIMARY KEY,
  platform_id TEXT NOT NULL,
  platform_name TEXT NOT NULL,
  record_date TEXT NOT NULL,
  record_month TEXT NOT NULL,
  day_of_month INTEGER NOT NULL,
  lottery_salary REAL DEFAULT 0,
  lottery_rebate REAL DEFAULT 0,
  live_ag REAL DEFAULT 0,
  chess_card REAL DEFAULT 0,
  external_rebate REAL DEFAULT 0,
  live_private_rebate REAL DEFAULT 0,
  lottery_dividend_received REAL DEFAULT 0,
  lottery_dividend_distributed REAL DEFAULT 0,
  external_dividend_received REAL DEFAULT 0,
  external_dividend_distributed REAL DEFAULT 0,
  private_rebate REAL DEFAULT 0,
  deposit REAL DEFAULT 0,
  withdrawal REAL DEFAULT 0,
  loan REAL DEFAULT 0,
  profit REAL DEFAULT 0,
  balance REAL DEFAULT 0,
  uploaded_by TEXT NOT NULL,
  upload_batch_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_upload_batches (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  record_month TEXT NOT NULL,
  platforms_count INTEGER DEFAULT 0,
  records_count INTEGER DEFAULT 0,
  uploaded_by TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_initial_balances (
  id TEXT PRIMARY KEY,
  platform_name TEXT NOT NULL,
  record_month TEXT NOT NULL,
  balance REAL DEFAULT 0,
  upload_batch_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(platform_name, record_month)
);

CREATE TABLE IF NOT EXISTS performance_reviews (
  id TEXT PRIMARY KEY,
  target_user_id TEXT NOT NULL,
  period TEXT NOT NULL,
  reviewer_id TEXT,
  updated_at DATETIME,
  task_completion_rate REAL DEFAULT 0,
  sop_completion_rate REAL DEFAULT 0,
  attendance_rate REAL DEFAULT 0,
  rating_work_attitude INTEGER DEFAULT 0,
  rating_professionalism INTEGER DEFAULT 0,
  rating_teamwork INTEGER DEFAULT 0,
  manager_comment TEXT DEFAULT '',
  total_score REAL DEFAULT 0,
  grade TEXT DEFAULT 'C',
  status TEXT DEFAULT 'DRAFT',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS report_authorizations (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  requester_dept TEXT NOT NULL,
  first_approver_id TEXT,
  first_approver_name TEXT,
  first_approver_dept TEXT,
  first_approved_at TEXT,
  first_approval_reason TEXT,
  second_approver_id TEXT,
  second_approver_name TEXT,
  second_approver_dept TEXT,
  second_approved_at TEXT,
  second_approval_reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT NOT NULL,
  expires_at TEXT,
  revoked_at TEXT,
  reject_reason TEXT
);
`;

const RAW_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_department ON tasks(assigned_to_department);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_sync ON tasks(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_timeline_task ON task_timeline(task_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_user ON sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON chat_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_participants ON chat_channels(participants);
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_def_name ON platform_definitions(name);
`;

exports.up = async function (knex) {
  // Split by semicolon and run each statement (better-sqlite3 doesn't support
  // multi-statement raw, so iterate)
  const statements = (RAW_SCHEMA + RAW_INDEXES)
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    await knex.raw(stmt);
  }
};

exports.down = async function () {
  // Intentionally a no-op: we do NOT auto-drop the entire schema.
  // If you need to wipe the DB in dev, delete the file directly.
  throw new Error(
    'Refusing to roll back the baseline schema migration. Delete the database file manually if you need a fresh start.'
  );
};
