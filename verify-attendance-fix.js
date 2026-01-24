const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Verifying AI Attendance Data Fix ===\n');

const users = db.prepare('SELECT id, name FROM users').all();
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const attendanceRecords = db.prepare('SELECT user_id, date, status FROM attendance_records WHERE date >= ? ORDER BY date DESC LIMIT 100').all(sevenDaysAgo);

console.log('Total records:', attendanceRecords.length);
console.log('Date range: from', sevenDaysAgo, 'to today\n');

if (attendanceRecords.length > 0) {
  const byUser = {};
  
  attendanceRecords.forEach(record => {
    if (!byUser[record.user_id]) {
      byUser[record.user_id] = { online: 0, offline: 0, dates: new Set() };
    }
    if (record.status === 'ONLINE') byUser[record.user_id].online++;
    else if (record.status === 'OFFLINE') byUser[record.user_id].offline++;
    byUser[record.user_id].dates.add(record.date);
  });
  
  let result = 'Recent 7 days: ' + attendanceRecords.length + ' attendance records\n';
  Object.keys(byUser).slice(0, 10).forEach(userId => {
    const user = users.find(u => u.id === userId);
    const stats = byUser[userId];
    const userName = user ? user.name : 'Unknown';
    const daysWorked = stats.dates.size;
    result += '  - ' + userName + ': ' + stats.online + ' online, ' + stats.offline + ' offline (' + daysWorked + ' days)\n';
  });
  
  console.log('AI will now see:\n');
  console.log(result);
  console.log('SUCCESS: AI has detailed attendance data!');
} else {
  console.log('No attendance records found');
}

db.close();
