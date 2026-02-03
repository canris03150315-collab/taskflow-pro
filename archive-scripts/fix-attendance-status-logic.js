const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the attendance summary logic to use correct status values (ONLINE/OFFLINE)
const oldLogic = `  // Attendance summary with details
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

const newLogic = `  // Attendance summary with details (status values: ONLINE/OFFLINE)
  const attendanceSummary = context.attendanceRecords.length > 0
    ? (() => {
        const summary = \`Recent 7 days: \${context.attendanceRecords.length} attendance records\\n\`;
        const byUser = {};
        const byDate = {};
        
        context.attendanceRecords.forEach(record => {
          if (!byUser[record.user_id]) {
            byUser[record.user_id] = { online: 0, offline: 0, total: 0, dates: [] };
          }
          byUser[record.user_id].total++;
          if (record.status === 'ONLINE') byUser[record.user_id].online++;
          else if (record.status === 'OFFLINE') byUser[record.user_id].offline++;
          if (!byUser[record.user_id].dates.includes(record.date)) {
            byUser[record.user_id].dates.push(record.date);
          }
          
          if (!byDate[record.date]) byDate[record.date] = { online: 0, offline: 0 };
          if (record.status === 'ONLINE') byDate[record.date].online++;
          else if (record.status === 'OFFLINE') byDate[record.date].offline++;
        });
        
        const userDetails = Object.keys(byUser).slice(0, 10).map(userId => {
          const user = context.users.find(u => u.id === userId);
          const stats = byUser[userId];
          const userName = user ? user.name : 'Unknown';
          const daysWorked = stats.dates.length;
          return \`  - \${userName}: \${stats.online} online, \${stats.offline} offline (\${daysWorked} days)\`;
        }).join('\\n');
        
        return summary + userDetails;
      })()
    : 'No recent attendance data';`;

if (!content.includes('// Attendance summary with details')) {
  console.log('ERROR: Cannot find attendance summary pattern');
  process.exit(1);
}

content = content.replace(oldLogic, newLogic);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed attendance status logic');
console.log('- Changed from present/late/absent/leave to ONLINE/OFFLINE');
console.log('- Added days worked count');
