const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

// Simulate getSystemContext
const users = db.prepare('SELECT id, name, role, department, username, created_at FROM users').all();
const departments = db.prepare('SELECT id, name FROM departments').all();
const tasks = db.prepare("SELECT id, title, status, urgency, assigned_to_user_id, deadline FROM tasks WHERE status != 'Completed' LIMIT 50").all();
const recentAnnouncements = db.prepare('SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC LIMIT 10').all();

console.log('=== AI System Context ===\n');
console.log('Users:', users.length);
console.log('Departments:', departments.length);
console.log('Active Tasks:', tasks.length);
console.log('Recent Announcements:', recentAnnouncements.length);

console.log('\n=== Data AI CANNOT access ===\n');

// Check what AI is missing
const attendance = db.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
console.log('Attendance records:', attendance.count, '(NOT accessible)');

const workLogs = db.prepare('SELECT COUNT(*) as count FROM work_logs').get();
console.log('Work logs:', workLogs.count, '(NOT accessible)');

const routines = db.prepare('SELECT COUNT(*) as count FROM routine_records').get();
console.log('Routine records:', routines.count, '(NOT accessible)');

const kolContracts = db.prepare('SELECT COUNT(*) as count FROM kol_contracts').get();
console.log('KOL contracts:', kolContracts.count, '(NOT accessible)');

db.close();
