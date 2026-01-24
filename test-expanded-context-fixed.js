const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Testing Expanded AI Context ===\n');

// Simulate the expanded getSystemContext function
const users = db.prepare('SELECT id, name, role, department, username, created_at FROM users').all();
const departments = db.prepare('SELECT id, name FROM departments').all();

const activeTasks = db.prepare("SELECT id, title, status, urgency, assigned_to_user_id, deadline FROM tasks WHERE status != 'Completed' LIMIT 50").all();
const completedTasksCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'Completed'").get();

const recentAnnouncements = db.prepare('SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC LIMIT 10').all();

const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const attendanceRecords = db.prepare('SELECT user_id, date, status FROM attendance_records WHERE date >= ? ORDER BY date DESC LIMIT 100').all(sevenDaysAgo);

const recentWorkLogs = db.prepare('SELECT id, user_id, content, date FROM work_logs ORDER BY date DESC LIMIT 10').all();

const today = new Date().toISOString().split('T')[0];
const routineRecords = db.prepare("SELECT department_id, COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed FROM routine_records WHERE date = ? GROUP BY department_id").all(today);

const kolContracts = db.prepare("SELECT id, kol_name, platform, status, monthly_fee FROM kol_contracts WHERE status = 'active' LIMIT 20").all();

const pendingApprovals = db.prepare("SELECT id, type, status, created_at FROM approvals WHERE status = 'pending' LIMIT 20").all();

const recentMemos = db.prepare('SELECT id, title, created_at FROM memos ORDER BY created_at DESC LIMIT 10').all();

console.log('AI can now access:');
console.log('- Users:', users.length);
console.log('- Departments:', departments.length);
console.log('- Active Tasks:', activeTasks.length);
console.log('- Completed Tasks:', completedTasksCount.count);
console.log('- Recent Announcements:', recentAnnouncements.length);
console.log('- Attendance Records (7 days):', attendanceRecords.length);
console.log('- Recent Work Logs:', recentWorkLogs.length);
console.log('- Routine Records (today):', routineRecords.length, 'departments');
console.log('- Active KOL Contracts:', kolContracts.length);
console.log('- Pending Approvals:', pendingApprovals.length);
console.log('- Recent Memos:', recentMemos.length);

console.log('\n=== Sample Data ===\n');

if (routineRecords.length > 0) {
  console.log('Today\'s Routine Completion:');
  routineRecords.forEach(r => {
    const dept = departments.find(d => d.id === r.department_id);
    const rate = r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0;
    console.log('  - ' + (dept ? dept.name : 'Unknown') + ': ' + r.completed + '/' + r.total + ' (' + rate + '%)');
  });
}

if (attendanceRecords.length > 0) {
  console.log('\nRecent Attendance (sample):');
  attendanceRecords.slice(0, 3).forEach(a => {
    const user = users.find(u => u.id === a.user_id);
    console.log('  - ' + (user ? user.name : 'Unknown') + ': ' + a.status + ' on ' + a.date);
  });
}

db.close();
console.log('\n=== AI is no longer a fool! ===');
