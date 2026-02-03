const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Testing AI Attendance Data ===\n');

const users = db.prepare('SELECT id, name, role, department, username, created_at FROM users').all();
const departments = db.prepare('SELECT id, name FROM departments').all();

const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const attendanceRecords = db.prepare('SELECT user_id, date, status FROM attendance_records WHERE date >= ? ORDER BY date DESC LIMIT 100').all(sevenDaysAgo);

console.log('Total attendance records (7 days):', attendanceRecords.length);
console.log('Date range: from', sevenDaysAgo, 'to today\n');

if (attendanceRecords.length === 0) {
  console.log('No recent attendance data');
} else {
  const summary = 'Recent 7 days: ' + attendanceRecords.length + ' attendance records\n';
  const byUser = {};
  
  attendanceRecords.forEach(record => {
    if (!byUser[record.user_id]) {
      byUser[record.user_id] = { present: 0, absent: 0, late: 0, leave: 0, total: 0 };
    }
    byUser[record.user_id].total++;
    if (record.status === 'present') byUser[record.user_id].present++;
    else if (record.status === 'absent') byUser[record.user_id].absent++;
    else if (record.status === 'late') byUser[record.user_id].late++;
    else if (record.status === 'leave') byUser[record.user_id].leave++;
  });
  
  console.log('What AI will see:\n');
  console.log(summary);
  
  const userIds = Object.keys(byUser).slice(0, 10);
  userIds.forEach(userId => {
    const user = users.find(u => u.id === userId);
    const stats = byUser[userId];
    const userName = user ? user.name : 'Unknown';
    console.log('  - ' + userName + ': ' + stats.present + ' present, ' + stats.late + ' late, ' + stats.absent + ' absent, ' + stats.leave + ' leave');
  });
}

db.close();
