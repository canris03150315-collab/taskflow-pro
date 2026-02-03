const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing AI assistant attendance display...\n');

// Find and replace the attendance summary section
const oldAttendance = `  // Attendance summary
  const attendanceSummary = context.attendanceRecords.length > 0
    ? \`Recent 7 days: \${context.attendanceRecords.length} records\`
    : 'No recent attendance data';`;

const newAttendance = `  // Attendance summary with detailed statistics
  const attendanceSummary = context.attendanceRecords.length > 0
    ? (() => {
        const byUser = {};
        context.attendanceRecords.forEach(record => {
          if (!byUser[record.user_id]) {
            byUser[record.user_id] = { online: 0, offline: 0, dates: new Set() };
          }
          if (record.status === 'ONLINE') byUser[record.user_id].online++;
          else if (record.status === 'OFFLINE') byUser[record.user_id].offline++;
          byUser[record.user_id].dates.add(record.date);
        });
        
        let result = \`Recent 7 days: \${context.attendanceRecords.length} attendance records\\n\`;
        Object.keys(byUser).forEach(userId => {
          const user = context.users.find(u => u.id === userId);
          const stats = byUser[userId];
          const userName = user ? user.name : 'Unknown';
          const daysWorked = stats.dates.size;
          result += \`  - \${userName}: \${stats.online} online, \${stats.offline} offline (\${daysWorked} days)\\n\`;
        });
        return result.trim();
      })()
    : 'No recent attendance data';`;

if (!content.includes('// Attendance summary')) {
  console.log('ERROR: Cannot find attendance summary section');
  process.exit(1);
}

content = content.replace(oldAttendance, newAttendance);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: AI assistant attendance display fixed');
console.log('- Added detailed per-user statistics');
console.log('- Shows online/offline counts and days worked');
console.log('- AI can now answer attendance questions accurately');
