const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the attendance summary section in buildSystemPrompt
const oldAttendanceSummary = `  // Attendance summary
  const attendanceSummary = context.attendanceRecords.length > 0
    ? \`Recent 7 days: \${context.attendanceRecords.length} records\`
    : 'No recent attendance data';`;

const newAttendanceSummary = `  // Attendance summary with details
  const attendanceSummary = context.attendanceRecords.length > 0
    ? (() => {
        const summary = \`Recent 7 days: \${context.attendanceRecords.length} attendance records\\n\`;
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
          return \`  - \${userName}: \${stats.present} present, \${stats.late} late, \${stats.absent} absent, \${stats.leave} leave\`;
        }).join('\\n');
        
        return summary + details;
      })()
    : 'No recent attendance data';`;

if (!content.includes('const attendanceSummary = context.attendanceRecords.length > 0')) {
  console.log('ERROR: Cannot find attendance summary pattern');
  process.exit(1);
}

content = content.replace(oldAttendanceSummary, newAttendanceSummary);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Improved AI attendance data presentation');
console.log('- Now shows detailed attendance statistics by user');
console.log('- Includes present/late/absent/leave counts');
