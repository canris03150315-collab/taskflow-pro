const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Checking all tables used in getSystemContext ===\n');

const requiredTables = [
  'users',
  'departments', 
  'tasks',
  'announcements',
  'attendance_records',
  'work_logs',
  'routine_records',
  'kol_profiles',
  'approvals',
  'memos'
];

const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);

console.log('Table existence check:');
requiredTables.forEach(table => {
  const exists = allTables.includes(table);
  const status = exists ? 'OK' : 'MISSING';
  console.log('  [' + status + '] ' + table);
});

console.log('\n=== Testing each query ===\n');

// Test users
try {
  const users = db.prepare('SELECT id, name, role, department, username, created_at FROM users').all();
  console.log('[OK] users: ' + users.length + ' records');
} catch (e) {
  console.log('[ERROR] users: ' + e.message);
}

// Test departments
try {
  const departments = db.prepare('SELECT id, name FROM departments').all();
  console.log('[OK] departments: ' + departments.length + ' records');
} catch (e) {
  console.log('[ERROR] departments: ' + e.message);
}

// Test tasks
try {
  const tasks = db.prepare("SELECT id, title, status, urgency, assigned_to_user_id, deadline FROM tasks WHERE status != 'Completed' LIMIT 50").all();
  console.log('[OK] tasks: ' + tasks.length + ' records');
} catch (e) {
  console.log('[ERROR] tasks: ' + e.message);
}

// Test announcements
try {
  const announcements = db.prepare('SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC LIMIT 10').all();
  console.log('[OK] announcements: ' + announcements.length + ' records');
} catch (e) {
  console.log('[ERROR] announcements: ' + e.message);
}

// Test attendance_records
try {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const attendance = db.prepare('SELECT user_id, date, status FROM attendance_records WHERE date >= ? ORDER BY date DESC LIMIT 100').all(sevenDaysAgo);
  console.log('[OK] attendance_records: ' + attendance.length + ' records');
} catch (e) {
  console.log('[ERROR] attendance_records: ' + e.message);
}

// Test work_logs
try {
  const workLogs = db.prepare('SELECT id, user_id, date FROM work_logs ORDER BY date DESC LIMIT 10').all();
  console.log('[OK] work_logs: ' + workLogs.length + ' records');
} catch (e) {
  console.log('[ERROR] work_logs: ' + e.message);
}

// Test routine_records
try {
  const today = new Date().toISOString().split('T')[0];
  const routines = db.prepare('SELECT id, department_id, completed_items FROM routine_records WHERE date = ?').all(today);
  console.log('[OK] routine_records: ' + routines.length + ' records');
} catch (e) {
  console.log('[ERROR] routine_records: ' + e.message);
}

// Test kol_profiles
try {
  const kols = db.prepare("SELECT id, platform_id as name, platform, status FROM kol_profiles WHERE status = 'ACTIVE' LIMIT 20").all();
  console.log('[OK] kol_profiles: ' + kols.length + ' records');
} catch (e) {
  console.log('[ERROR] kol_profiles: ' + e.message);
}

// Test approvals
try {
  const approvals = db.prepare("SELECT id, type, status, created_at FROM approvals WHERE status = 'pending' LIMIT 20").all();
  console.log('[OK] approvals: ' + approvals.length + ' records');
} catch (e) {
  console.log('[ERROR] approvals: ' + e.message);
}

// Test memos
try {
  const memos = db.prepare('SELECT id, title, created_at FROM memos ORDER BY created_at DESC LIMIT 10').all();
  console.log('[OK] memos: ' + memos.length + ' records');
} catch (e) {
  console.log('[ERROR] memos: ' + e.message);
}

db.close();
console.log('\n=== Diagnosis complete ===');
