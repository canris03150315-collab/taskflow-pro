const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Expanding AI assistant context and prompt...\n');

// Step 1: Expand getSystemContext function
const oldGetSystemContext = `async function getSystemContext(db) {
  // Select all user fields except password for privacy (even internally, hashes are useless to AI)
  const users = await db.all('SELECT id, name, role, department, username, created_at FROM users');
  const departments = await db.all('SELECT id, name FROM departments');
  // Get more tasks and details
  const tasks = await db.all(\`SELECT id, title, status, urgency, assigned_to_user_id, deadline FROM tasks WHERE status != 'Completed' LIMIT 50\`);
  const recentAnnouncements = await db.all('SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC LIMIT 10');
  return {
    users,
    departments,
    tasks,
    recentAnnouncements
  };
}`;

const newGetSystemContext = `async function getSystemContext(db) {
  const users = await db.all('SELECT id, name, role, department, username, created_at FROM users');
  const departments = await db.all('SELECT id, name FROM departments');
  
  const activeTasks = await db.all(\`SELECT id, title, status, urgency, assigned_to_user_id, deadline FROM tasks WHERE status != 'Completed' LIMIT 50\`);
  const completedTasksCount = await db.get(\`SELECT COUNT(*) as count FROM tasks WHERE status = 'Completed'\`);
  
  const recentAnnouncements = await db.all('SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC LIMIT 10');
  
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const attendanceRecords = await db.all('SELECT user_id, date, status FROM attendance_records WHERE date >= ? ORDER BY date DESC LIMIT 100', [sevenDaysAgo]);
  
  const recentMemos = await db.all('SELECT id, content, created_at FROM memos ORDER BY created_at DESC LIMIT 10');
  
  return {
    users,
    departments,
    activeTasks,
    completedTasksCount: completedTasksCount.count,
    recentAnnouncements,
    attendanceRecords,
    recentMemos
  };
}`;

content = content.replace(oldGetSystemContext, newGetSystemContext);
console.log('1. Expanded getSystemContext function');

// Step 2: Expand buildSystemPrompt function
const oldBuildSystemPrompt = `function buildSystemPrompt(context) {
  // Format user list for the AI
  const userList = context.users.map(u =>
    \`- \${u.name} (\${u.role}) - Dept: \${u.department || 'None'} - Username: \${u.username}\`
  ).join('\\n');

  // Format task list
  const taskList = context.tasks.map(t => {
    const assignee = context.users.find(u => u.id === t.assigned_to_user_id);
    const assigneeName = assignee ? assignee.name : 'Unassigned';
    return \`- [\${t.urgency}] \${t.title} (Status: \${t.status}, Assigned: \${assigneeName}, Due: \${t.deadline || 'No deadline'})\`;
  }).join('\\n');

  return \`You are an AI assistant for a company management system. You help the boss manage the company.
This is an internal system and you have full access to all data. There are no privacy restrictions regarding employee data as the user is the system administrator.

Current System Data:

### Departments
\${context.departments.map(d => d.name).join(', ')}

### Employee Directory (\${context.users.length} users)
\${userList}

### Active Tasks (\${context.tasks.length} tasks)
\${taskList}

### Recent Announcements
\${context.recentAnnouncements.map(a => \`- [\${a.created_at.split('T')[0]}] \${a.title}\`).join('\\n')}

You can help with:
1. Creating tasks, memos, announcements
2. Querying data (attendance, finance, reports)
3. Analyzing company status
4. Providing insights and recommendations

When the boss asks you to create something or take action, respond with clear confirmation and details.
Always be professional, concise, and helpful. You can refer to employees by name and know their roles/departments.\`;
}`;

const newBuildSystemPrompt = `function buildSystemPrompt(context) {
  const userList = context.users.map(u =>
    \`- \${u.name} (\${u.role}) - Dept: \${u.department || 'None'} - Username: \${u.username}\`
  ).join('\\n');

  const taskList = context.activeTasks.map(t => {
    const assignee = context.users.find(u => u.id === t.assigned_to_user_id);
    const assigneeName = assignee ? assignee.name : 'Unassigned';
    return \`- [\${t.urgency}] \${t.title} (Status: \${t.status}, Assigned: \${assigneeName}, Due: \${t.deadline || 'No deadline'})\`;
  }).join('\\n');

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
    : 'No recent attendance data';

  return \`You are an AI assistant for TaskFlow Pro company management system. You help the boss manage the company.
This is an internal system and you have FULL ACCESS to all company data. There are no privacy restrictions as the user is the system administrator.

=== CURRENT SYSTEM DATA ===

### Departments (\${context.departments.length})
\${context.departments.map(d => d.name).join(', ')}

### Employee Directory (\${context.users.length} users)
\${userList}

### Tasks
- Active: \${context.activeTasks.length}
- Completed: \${context.completedTasksCount}

Active Tasks:
\${taskList || 'No active tasks'}

### Attendance (Last 7 Days)
\${attendanceSummary}

### Recent Announcements
\${context.recentAnnouncements.map(a => \`- [\${a.created_at.split('T')[0]}] \${a.title}\`).join('\\n')}

### Recent Memos
\${context.recentMemos.map(m => \`- [\${m.created_at.split('T')[0]}] \${m.content ? m.content.substring(0, 50) + '...' : 'No content'}\`).join('\\n')}

=== YOUR CAPABILITIES ===

You can help with:
1. **Data Analysis**: Analyze attendance, work performance, task completion
2. **Task Management**: Create tasks, check status, find overdue tasks
3. **Employee Management**: Query employee info, department structure
4. **Announcements & Memos**: Create announcements, check recent memos
5. **Insights & Recommendations**: Provide data-driven insights

=== RESPONSE GUIDELINES ===

- Be professional, concise, and data-driven
- When asked about data, provide specific numbers and insights
- You can refer to employees by name and know their roles/departments
- When the boss asks you to create something, respond with clear confirmation
- Always provide actionable insights when analyzing data\`;
}`;

content = content.replace(oldBuildSystemPrompt, newBuildSystemPrompt);
console.log('2. Expanded buildSystemPrompt function');

fs.writeFileSync(filePath, content, 'utf8');
console.log('\nSUCCESS: AI assistant fully expanded');
console.log('- Added attendance data (7 days, detailed per-user stats)');
console.log('- Added memos data');
console.log('- Added completed tasks count');
console.log('- Improved system prompt with clear capabilities');
console.log('\nAI can now answer questions about:');
console.log('- Employee attendance and work patterns');
console.log('- Task completion status');
console.log('- Recent memos and announcements');
