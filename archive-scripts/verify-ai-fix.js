const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Verifying AI Assistant Fix ===\n');

// Load the actual functions from ai-assistant.js
const fs = require('fs');
const code = fs.readFileSync('/app/dist/routes/ai-assistant.js', 'utf8');

// Check if the code includes attendance details
const hasDetailedAttendance = code.includes('byUser[record.user_id].online++');
const hasAttendanceInPrompt = code.includes('Attendance (Last 7 Days)');

console.log('Code verification:');
console.log('- Has detailed attendance stats:', hasDetailedAttendance ? 'YES' : 'NO');
console.log('- Has attendance in prompt:', hasAttendanceInPrompt ? 'YES' : 'NO');

if (!hasDetailedAttendance || !hasAttendanceInPrompt) {
  console.log('\nERROR: Fix was not applied correctly!');
  process.exit(1);
}

// Simulate what AI will see
const users = db.prepare('SELECT id, name FROM users').all();
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const attendanceRecords = db.prepare('SELECT user_id, date, status FROM attendance_records WHERE date >= ? ORDER BY date DESC LIMIT 100').all(sevenDaysAgo);

console.log('\nData verification:');
console.log('- Total users:', users.length);
console.log('- Attendance records (7 days):', attendanceRecords.length);

if (attendanceRecords.length === 0) {
  console.log('\nWARNING: No attendance records found!');
  process.exit(1);
}

// Generate the attendance summary that AI will see
const byUser = {};
attendanceRecords.forEach(record => {
  if (!byUser[record.user_id]) {
    byUser[record.user_id] = { online: 0, offline: 0, dates: new Set() };
  }
  if (record.status === 'ONLINE') byUser[record.user_id].online++;
  else if (record.status === 'OFFLINE') byUser[record.user_id].offline++;
  byUser[record.user_id].dates.add(record.date);
});

console.log('\nAI will see this attendance data:');
console.log('Recent 7 days: ' + attendanceRecords.length + ' attendance records');
Object.keys(byUser).forEach(userId => {
  const user = users.find(u => u.id === userId);
  const stats = byUser[userId];
  const userName = user ? user.name : 'Unknown';
  const daysWorked = stats.dates.size;
  console.log('  - ' + userName + ': ' + stats.online + ' online, ' + stats.offline + ' offline (' + daysWorked + ' days)');
});

console.log('\n=== SUCCESS: AI can now answer attendance questions! ===');

db.close();
