const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

// Load the actual ai-assistant.js module functions
const fs = require('fs');
const aiAssistantCode = fs.readFileSync('/app/dist/routes/ai-assistant.js', 'utf8');

// Extract and test getSystemContext function
async function getSystemContext() {
  const users = db.prepare('SELECT id, name, role, department, username, created_at FROM users').all();
  const departments = db.prepare('SELECT id, name FROM departments').all();
  
  const activeTasks = db.prepare("SELECT id, title, status, urgency, assigned_to_user_id, deadline FROM tasks WHERE status != 'Completed' LIMIT 50").all();
  const completedTasksCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'Completed'").get();
  
  const recentAnnouncements = db.prepare('SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC LIMIT 10').all();
  
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const attendanceRecords = db.prepare('SELECT user_id, date, status FROM attendance_records WHERE date >= ? ORDER BY date DESC LIMIT 100').all(sevenDaysAgo);
  
  const recentWorkLogs = db.prepare('SELECT id, user_id, date FROM work_logs ORDER BY date DESC LIMIT 10').all();
  
  const today = new Date().toISOString().split('T')[0];
  const routineRecords = db.prepare('SELECT id, department_id, completed_items FROM routine_records WHERE date = ?').all(today);
  
  const routinesByDept = {};
  routineRecords.forEach(record => {
    if (!routinesByDept[record.department_id]) {
      routinesByDept[record.department_id] = { total: 0, completed: 0 };
    }
    try {
      const items = JSON.parse(record.completed_items || '[]');
      routinesByDept[record.department_id].total += items.length;
      routinesByDept[record.department_id].completed += items.filter(item => item.completed).length;
    } catch (e) {
      // Skip invalid JSON
    }
  });
  
  const routineRecordsSummary = Object.keys(routinesByDept).map(deptId => ({
    department_id: deptId,
    total: routinesByDept[deptId].total,
    completed: routinesByDept[deptId].completed
  }));
  
  const kolContracts = db.prepare("SELECT id, platform_id as name, platform, status FROM kol_profiles WHERE status = 'ACTIVE' LIMIT 20").all();
  
  const pendingApprovals = [];
  
  const recentMemos = db.prepare('SELECT id, content, created_at FROM memos ORDER BY created_at DESC LIMIT 10').all();
  
  return {
    users,
    departments,
    activeTasks,
    completedTasksCount,
    recentAnnouncements,
    attendanceRecords,
    recentWorkLogs,
    routineRecords: routineRecordsSummary,
    kolContracts,
    pendingApprovals,
    recentMemos
  };
}

console.log('=== Testing System Prompt Generation ===\n');

const context = getSystemContext();

console.log('Context data loaded:');
console.log('- Users:', context.users.length);
console.log('- Departments:', context.departments.length);
console.log('- Active Tasks:', context.activeTasks.length);
console.log('- Attendance Records:', context.attendanceRecords.length);
console.log('- Work Logs:', context.recentWorkLogs.length);
console.log('- Routine Records:', context.routineRecords.length);
console.log('- KOL Contracts:', context.kolContracts.length);
console.log('- Memos:', context.recentMemos.length);

console.log('\n=== Checking Attendance Summary in buildSystemPrompt ===\n');

// Check if the attendance summary is being generated correctly
const byUser = {};
context.attendanceRecords.forEach(record => {
  if (!byUser[record.user_id]) {
    byUser[record.user_id] = { online: 0, offline: 0, dates: new Set() };
  }
  if (record.status === 'ONLINE') byUser[record.user_id].online++;
  else if (record.status === 'OFFLINE') byUser[record.user_id].offline++;
  byUser[record.user_id].dates.add(record.date);
});

let attendanceSummary = 'Recent 7 days: ' + context.attendanceRecords.length + ' attendance records\n';
Object.keys(byUser).slice(0, 10).forEach(userId => {
  const user = context.users.find(u => u.id === userId);
  const stats = byUser[userId];
  const userName = user ? user.name : 'Unknown';
  const daysWorked = stats.dates.size;
  attendanceSummary += '  - ' + userName + ': ' + stats.online + ' online, ' + stats.offline + ' offline (' + daysWorked + ' days)\n';
});

console.log('Attendance summary that will be sent to AI:');
console.log(attendanceSummary);

console.log('\n=== Checking if buildSystemPrompt includes attendance ===\n');

// Check if the actual code has the attendance summary
const hasAttendanceSummary = aiAssistantCode.includes('attendanceSummary');
const hasAttendanceInPrompt = aiAssistantCode.includes('${attendanceSummary}') || aiAssistantCode.includes('Attendance');

console.log('Code includes attendanceSummary variable:', hasAttendanceSummary);
console.log('Code includes attendance in prompt:', hasAttendanceInPrompt);

if (!hasAttendanceInPrompt) {
  console.log('\nWARNING: Attendance data may not be included in the system prompt!');
  console.log('Searching for system prompt template...');
  
  const promptMatch = aiAssistantCode.match(/return `You are an AI assistant[\s\S]{0,2000}/);
  if (promptMatch) {
    console.log('\nFound system prompt (first 500 chars):');
    console.log(promptMatch[0].substring(0, 500));
  }
}

db.close();
