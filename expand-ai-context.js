const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the getSystemContext function
const oldFunction = /async function getSystemContext\(db\) \{[\s\S]*?return \{[\s\S]*?\};[\s\S]*?\}/;

const newFunction = `async function getSystemContext(db) {
  // Basic data
  const users = await db.all('SELECT id, name, role, department, username, created_at FROM users');
  const departments = await db.all('SELECT id, name FROM departments');
  
  // Tasks
  const activeTasks = await db.all(\`SELECT id, title, status, urgency, assigned_to_user_id, deadline FROM tasks WHERE status != 'Completed' LIMIT 50\`);
  const completedTasksCount = await db.get("SELECT COUNT(*) as count FROM tasks WHERE status = 'Completed'");
  
  // Announcements
  const recentAnnouncements = await db.all('SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC LIMIT 10');
  
  // Attendance - Recent 7 days summary
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const attendanceRecords = await db.all(\`SELECT user_id, date, status FROM attendance_records WHERE date >= ? ORDER BY date DESC LIMIT 100\`, [sevenDaysAgo]);
  
  // Work logs - Recent 10
  const recentWorkLogs = await db.all('SELECT id, user_id, content, date FROM work_logs ORDER BY date DESC LIMIT 10');
  
  // Routines - Today's completion rate by department
  const today = new Date().toISOString().split('T')[0];
  const routineRecords = await db.all(\`SELECT department_id, COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed FROM routine_records WHERE date = ? GROUP BY department_id\`, [today]);
  
  // KOL Contracts - Active contracts
  const kolContracts = await db.all("SELECT id, kol_name, platform, status, monthly_fee FROM kol_contracts WHERE status = 'active' LIMIT 20");
  
  // Approvals - Pending approvals
  const pendingApprovals = await db.all("SELECT id, type, status, created_at FROM approvals WHERE status = 'pending' LIMIT 20");
  
  // Memos - Recent 10
  const recentMemos = await db.all('SELECT id, title, created_at FROM memos ORDER BY created_at DESC LIMIT 10');
  
  return {
    users,
    departments,
    activeTasks,
    completedTasksCount: completedTasksCount.count,
    recentAnnouncements,
    attendanceRecords,
    recentWorkLogs,
    routineRecords,
    kolContracts,
    pendingApprovals,
    recentMemos
  };
}`;

if (!oldFunction.test(content)) {
  console.log('ERROR: Cannot find getSystemContext function');
  process.exit(1);
}

content = content.replace(oldFunction, newFunction);
fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Expanded getSystemContext function');
