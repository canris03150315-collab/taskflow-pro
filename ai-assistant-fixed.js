const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyC6R9gl7hIepi-DhaApDD9m0p2sDpcv0hw';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const users = req.app.locals.db.prepare('SELECT * FROM users WHERE id = ?').all(token);
  if (users.length === 0) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  req.user = users[0];
  next();
}

async function getSystemContext(db) {
  const users = await db.all('SELECT id, name, role, department, username, created_at FROM users');
  const departments = await db.all('SELECT id, name FROM departments');
  
  const activeTasks = await db.all(`SELECT id, title, status, urgency, assigned_to_user_id, deadline FROM tasks WHERE status != 'Completed' LIMIT 50`);
  const completedTasksCount = await db.get(`SELECT COUNT(*) as count FROM tasks WHERE status = 'Completed'`);
  
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
}

function buildSystemPrompt(context) {
  const userList = context.users.map(u =>
    `- ${u.name} (${u.role}) - Dept: ${u.department || 'None'} - Username: ${u.username}`
  ).join('\n');

  const taskList = context.activeTasks.map(t => {
    const assignee = context.users.find(u => u.id === t.assigned_to_user_id);
    const assigneeName = assignee ? assignee.name : 'Unassigned';
    return `- [${t.urgency}] ${t.title} (Status: ${t.status}, Assigned: ${assigneeName}, Due: ${t.deadline || 'No deadline'})`;
  }).join('\n');

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
        
        let result = `Recent 7 days: ${context.attendanceRecords.length} attendance records\n`;
        Object.keys(byUser).forEach(userId => {
          const user = context.users.find(u => u.id === userId);
          const stats = byUser[userId];
          const userName = user ? user.name : 'Unknown';
          const daysWorked = stats.dates.size;
          result += `  - ${userName}: ${stats.online} online, ${stats.offline} offline (${daysWorked} days)\n`;
        });
        return result.trim();
      })()
    : 'No recent attendance data';

  return `You are an AI assistant for TaskFlow Pro company management system. You help the boss manage the company.
This is an internal system and you have FULL ACCESS to all company data. There are no privacy restrictions as the user is the system administrator.

=== CURRENT SYSTEM DATA ===

### Departments (${context.departments.length})
${context.departments.map(d => d.name).join(', ')}

### Employee Directory (${context.users.length} users)
${userList}

### Tasks
- Active: ${context.activeTasks.length}
- Completed: ${context.completedTasksCount}

Active Tasks:
${taskList || 'No active tasks'}

### Attendance (Last 7 Days)
${attendanceSummary}

### Recent Announcements
${context.recentAnnouncements.map(a => `- [${a.created_at.split('T')[0]}] ${a.title}`).join('\n')}

### Recent Memos
${context.recentMemos.map(m => `- [${m.created_at.split('T')[0]}] ${m.content ? m.content.substring(0, 50) + '...' : 'No content'}`).join('\n')}

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
- Always provide actionable insights when analyzing data`;
}

router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const userId = req.user.id;

    const conversations = await db.all(
      'SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 50',
      [userId]
    );

    conversations.reverse();

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

router.post('/query', authenticateToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { message } = req.body;
    const userId = req.user.id;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userMsgId = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      'INSERT INTO ai_conversations (id, user_id, role, message, created_at) VALUES (?, ?, ?, ?, ?)',
      [userMsgId, userId, 'user', message, now]
    );

    const recentConversations = await db.all(
      'SELECT role, message FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [userId]
    );

    const conversationHistory = recentConversations.reverse().map(conv => ({
      role: conv.role === 'user' ? 'user' : 'model',
      parts: [{ text: conv.message }]
    }));

    const systemContext = await getSystemContext(db);
    const systemPrompt = buildSystemPrompt(systemContext);

    let aiResponse = '';

    try {
      const response = await fetch(GEMINI_API_URL + '?key=' + GEMINI_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            ...conversationHistory,
            { role: 'user', parts: [{ text: message }] }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
          }
        })
      });

      if (!response.ok) {
        console.error('Gemini API error status:', response.status);
        aiResponse = '\u26a0\ufe0f AI \u670d\u52d9\u66ab\u6642\u7121\u6cd5\u4f7f\u7528 (\u932f\u8aa4\u4ee3\u78bc: ' + response.status + ')\u3002\u8acb\u6aa2\u67e5 API Key \u8a2d\u5b9a\u6216\u7a0d\u5f8c\u518d\u8a66\u3002';
      } else {
        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          aiResponse = data.candidates[0].content.parts[0].text;
        } else {
          aiResponse = '\u26a0\ufe0f AI \u7121\u6cd5\u751f\u6210\u56de\u7b54\u3002\u8acb\u518d\u8a66\u4e00\u6b21\u3002';
        }
      }
    } catch (apiError) {
      console.error('AI query error:', apiError);
      aiResponse = '\u26a0\ufe0f AI \u670d\u52d9\u66ab\u6642\u7121\u6cd5\u4f7f\u7528\u3002\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002';
    }

    const aiMsgId = uuidv4();
    await db.run(
      'INSERT INTO ai_conversations (id, user_id, role, message, created_at) VALUES (?, ?, ?, ?, ?)',
      [aiMsgId, userId, 'assistant', aiResponse, new Date().toISOString()]
    );

    res.json({ response: aiResponse });
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Failed to process query' });
  }
});

module.exports = router;
