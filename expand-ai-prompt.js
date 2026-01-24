const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the buildSystemPrompt function
const oldPromptFunction = /function buildSystemPrompt\(context\) \{[\s\S]*?return `You are an AI assistant[\s\S]*?`;[\s\S]*?\}/;

const newPromptFunction = `function buildSystemPrompt(context) {
  // Format user list
  const userList = context.users.map(u =>
    \`- \${u.name} (\${u.role}) - Dept: \${u.department || 'None'} - Username: \${u.username}\`
  ).join('\\n');

  // Format task list
  const taskList = context.activeTasks.map(t => {
    const assignee = context.users.find(u => u.id === t.assigned_to_user_id);
    const assigneeName = assignee ? assignee.name : 'Unassigned';
    return \`- [\${t.urgency}] \${t.title} (Status: \${t.status}, Assigned: \${assigneeName}, Due: \${t.deadline || 'No deadline'})\`;
  }).join('\\n');

  // Attendance summary
  const attendanceSummary = context.attendanceRecords.length > 0 
    ? \`Recent 7 days: \${context.attendanceRecords.length} records\` 
    : 'No recent attendance data';

  // Work logs summary
  const workLogsSummary = context.recentWorkLogs.length > 0
    ? \`Recent work logs: \${context.recentWorkLogs.length} entries\`
    : 'No recent work logs';

  // Routines summary
  const routinesSummary = context.routineRecords.length > 0
    ? context.routineRecords.map(r => {
        const dept = context.departments.find(d => d.id === r.department_id);
        const rate = r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0;
        return \`- \${dept ? dept.name : 'Unknown'}: \${r.completed}/\${r.total} (\${rate}%)\`;
      }).join('\\n')
    : 'No routine data for today';

  // KOL contracts summary
  const kolSummary = context.kolContracts.length > 0
    ? \`Active KOL contracts: \${context.kolContracts.length}\`
    : 'No active KOL contracts';

  // Pending approvals
  const approvalsSummary = context.pendingApprovals.length > 0
    ? \`Pending approvals: \${context.pendingApprovals.length}\`
    : 'No pending approvals';

  return \`You are an AI assistant for TaskFlow Pro, a comprehensive company management system. You help the boss manage the company.

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

### Attendance
\${attendanceSummary}

### Work Logs
\${workLogsSummary}

### Daily Routines (Today)
\${routinesSummary}

### KOL Management
\${kolSummary}

### Approvals
\${approvalsSummary}

### Recent Announcements
\${context.recentAnnouncements.map(a => \`- [\${a.created_at.split('T')[0]}] \${a.title}\`).join('\\n')}

### Recent Memos
\${context.recentMemos.map(m => \`- [\${m.created_at.split('T')[0]}] \${m.title}\`).join('\\n')}

=== YOUR CAPABILITIES ===

You can help with:
1. **Data Analysis**: Analyze attendance, work logs, task completion, routine execution rates
2. **Task Management**: Create tasks, check task status, find overdue tasks
3. **Employee Management**: Query employee info, department structure, work performance
4. **KOL Management**: Check KOL contracts, analyze platform distribution
5. **Approval Management**: Check pending approvals, approval status
6. **Announcements & Memos**: Create announcements, check recent memos
7. **Insights & Recommendations**: Provide data-driven insights and suggestions

=== RESPONSE GUIDELINES ===

- Be professional, concise, and data-driven
- When asked about data, provide specific numbers and insights
- You can refer to employees by name and know their roles/departments
- When the boss asks you to create something, respond with clear confirmation
- If you need more specific data, you can ask clarifying questions
- Always provide actionable insights when analyzing data

You have access to real company data. Use it to provide valuable insights.\`;
}`;

if (!oldPromptFunction.test(content)) {
  console.log('ERROR: Cannot find buildSystemPrompt function');
  process.exit(1);
}

content = content.replace(oldPromptFunction, newPromptFunction);
fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Expanded buildSystemPrompt function');
