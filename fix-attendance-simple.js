const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the simple attendance summary with detailed one
const oldPattern = `  // Attendance summary
  const attendanceSummary = context.attendanceRecords.length > 0
    ? \`Recent 7 days: \${context.attendanceRecords.length} records\`
    : 'No recent attendance data';`;

const newPattern = `  // Attendance summary with details (status: ONLINE/OFFLINE)
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
        Object.keys(byUser).slice(0, 10).forEach(userId => {
          const user = context.users.find(u => u.id === userId);
          const stats = byUser[userId];
          const userName = user ? user.name : 'Unknown';
          const daysWorked = stats.dates.size;
          result += \`  - \${userName}: \${stats.online} online, \${stats.offline} offline (\${daysWorked} days)\\n\`;
        });
        return result;
      })()
    : 'No recent attendance data';`;

content = content.replace(oldPattern, newPattern);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Updated attendance summary with detailed statistics');
