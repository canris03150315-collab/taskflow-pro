const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

// Simulate getSystemContext
async function getSystemContext() {
  const users = db.prepare('SELECT id, name, role, department, username, created_at FROM users').all();
  const departments = db.prepare('SELECT id, name FROM departments').all();
  
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const attendanceRecords = db.prepare('SELECT user_id, date, status FROM attendance_records WHERE date >= ? ORDER BY date DESC LIMIT 100').all(sevenDaysAgo);
  
  return { users, departments, attendanceRecords };
}

// Simulate buildSystemPrompt attendance section
function buildAttendanceSummary(context) {
  if (context.attendanceRecords.length === 0) {
    return 'No recent attendance data';
  }
  
  const summary = `Recent 7 days: ${context.attendanceRecords.length} attendance records\n`;
  const byUser = {};
  
  context.attendanceRecords.forEach(record => {
    if (!byUser[record.user_id]) {
      byUser[record.user_id] = { present: 0, absent: 0, late: 0, leave: 0, total: 0 };
    }
    byUser[record.user_id].total++;
    if (record.status === 'present') byUser[record.user_id].present++;
    else if (record.status === 'absent') byUser[record.user_id].absent++;
    else if (record.status === 'late') byUser[record.user_id].late++;
    else if (record.status === 'leave') byUser[record.user_id].leave++;
  });
  
  const details = Object.keys(byUser).slice(0, 10).map(userId => {
    const user = context.users.find(u => u.id === userId);
    const stats = byUser[userId];
    const userName = user ? user.name : 'Unknown';
    return `  - ${userName}: ${stats.present} present, ${stats.late} late, ${stats.absent} absent, ${stats.leave} leave`;
  }).join('\n');
  
  return summary + details;
}

console.log('=== Testing AI Attendance Data ===\n');

const context = getSystemContext();
console.log('Total attendance records (7 days):', context.attendanceRecords.length);
console.log('\nWhat AI will see:\n');
console.log(buildAttendanceSummary(context));

db.close();
