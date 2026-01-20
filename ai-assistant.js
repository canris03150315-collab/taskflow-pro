const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Updated to use gemini-2.0-flash which is available and faster
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Check if user is boss
function checkBossPermission(req, res, next) {
  const currentUser = req.user;
  if (currentUser.role !== 'BOSS') {
    return res.status(403).json({ error: 'Only boss can access AI assistant' });
  }
  next();
}

// GET /conversations - Get conversation history
router.get('/conversations', authenticateToken, checkBossPermission, async (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    
    // Add rowid DESC to ensure correct order when timestamps are identical
    const conversations = await db.all(
      'SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?',
      [userId, limit]
    );
    
    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// POST /query - Send query to AI assistant
router.post('/query', authenticateToken, checkBossPermission, async (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Save user message
    const userMsgId = uuidv4();
    const now = new Date().toISOString();
    
    await db.run(
      'INSERT INTO ai_conversations (id, user_id, role, message, created_at) VALUES (?, ?, ?, ?, ?)',
      [userMsgId, userId, 'user', message, now]
    );
    
    // Get recent conversation history for context
    const recentConversations = await db.all(
      'SELECT role, message FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [userId]
    );
    
    // Build context from history
    const conversationHistory = recentConversations.reverse().map(conv => ({
      role: conv.role === 'user' ? 'user' : 'model',
      parts: [{ text: conv.message }]
    }));
    
    // Get system data for context
    const systemContext = await getSystemContext(db);
    
    // Build system prompt
    const systemPrompt = buildSystemPrompt(systemContext);
    
    // Call Gemini API
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
        // Fallback message: "⚠️ AI 服務暫時無法使用 (錯誤代碼: [status])。請檢查 API Key 設定或稍後再試。"
        aiResponse = '\u26a0\ufe0f AI \u670d\u52d9\u66ab\u6642\u7121\u6cd5\u4f7f\u7528 (\u932f\u8aa4\u4ee3\u78bc: ' + response.status + ')\u3002\u8acb\u6aa2\u67e5 API Key \u8a2d\u5b9a\u6216\u7a0d\u5f8c\u518d\u8a66\u3002';
      } else {
        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          aiResponse = data.candidates[0].content.parts[0].text;
        } else {
          console.error('Unexpected Gemini response structure:', JSON.stringify(data));
          aiResponse = '\u26a0\ufe0f AI \u56de\u61c9\u683c\u5f0f\u7570\u5e38\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002';
        }
      }
    } catch (fetchError) {
      console.error('Gemini API network error:', fetchError);
      // Fallback message: "⚠️ 網路連線錯誤，無法連接至 AI 服務。"
      aiResponse = '\u26a0\ufe0f \u7db2\u8def\u9023\u7dda\u932f\u8aa4\uff0c\u7121\u6cd5\u9023\u63a5\u81f3 AI \u670d\u52d9\u3002';
    }
    
    // Analyze intent and check if action is needed
    const intentAnalysis = analyzeIntent(message, aiResponse);
    
    let actionResult = null;
    if (intentAnalysis.needsAction) {
      actionResult = await executeAction(db, userId, intentAnalysis, req);
    }
    
    // Save AI response
    const aiMsgId = uuidv4();
    const aiResponseTime = new Date().toISOString();
    
    await db.run(
      'INSERT INTO ai_conversations (id, user_id, role, message, intent, action_taken, action_result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [aiMsgId, userId, 'assistant', aiResponse, 
        intentAnalysis.intent || null,
        intentAnalysis.action || null,
        actionResult ? JSON.stringify(actionResult) : null,
        aiResponseTime]
    );
    
    res.json({ 
      response: aiResponse,
      intent: intentAnalysis.intent,
      actionTaken: intentAnalysis.action,
      actionResult: actionResult
    });
    
  } catch (error) {
    console.error('AI query error:', error);
    res.status(500).json({ error: 'Failed to process query' });
  }
});

// DELETE /conversations/:id - Delete a conversation
router.delete('/conversations/:id', authenticateToken, checkBossPermission, async (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;
    const { id } = req.params;
    
    await db.run(
      'DELETE FROM ai_conversations WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// DELETE /conversations - Clear all conversations
router.delete('/conversations', authenticateToken, checkBossPermission, async (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;
    
    await db.run(
      'DELETE FROM ai_conversations WHERE user_id = ?',
      [userId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Clear conversations error:', error);
    res.status(500).json({ error: 'Failed to clear conversations' });
  }
});

// Helper: Get system context
async function getSystemContext(db) {
  // Select all user fields except password for privacy (even internally, hashes are useless to AI)
  const users = await db.all('SELECT id, name, role, department, username, created_at FROM users');
  const departments = await db.all('SELECT id, name FROM departments');
  // Get more tasks and details
  const tasks = await db.all(`SELECT id, title, status, urgency, assigned_to_user_id, deadline FROM tasks WHERE status != 'Completed' LIMIT 50`);
  const recentAnnouncements = await db.all('SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC LIMIT 10');
  const memories = await db.all('SELECT content, created_at FROM ai_memories ORDER BY created_at DESC LIMIT 20');
  const recentFinance = await db.all('SELECT type, amount, category, description, date, status, department_id FROM finance ORDER BY date DESC LIMIT 20');
  const recentKolPayments = await db.all('SELECT amount, payment_date, payment_type, notes FROM kol_payments ORDER BY payment_date DESC LIMIT 10');
  
  return {
    users,
    departments,
    tasks,
    recentAnnouncements,
    memories,
    recentFinance,
    recentKolPayments
  };
}

// Helper: Build system prompt
function buildSystemPrompt(context) {
  // Format user list for the AI
  const userList = context.users.map(u => {
    const dept = context.departments.find(d => d.id === u.department);
    const deptName = dept ? dept.name : (u.department || 'None');
    return `- ${u.name} (${u.role}) - Dept: ${deptName} - Username: ${u.username}`;
  }).join('\n');

  // Format task list
  const taskList = context.tasks.map(t => {
    const assignee = context.users.find(u => u.id === t.assigned_to_user_id);
    const assigneeName = assignee ? assignee.name : 'Unassigned';
    return `- [${t.urgency}] ${t.title} (Status: ${t.status}, Assigned: ${assigneeName}, Due: ${t.deadline || 'No deadline'})`;
  }).join('\n');

  // Format memories
  const memoryList = context.memories && context.memories.length > 0 
    ? context.memories.map(m => `- ${m.content}`).join('\n') 
    : 'No long-term memories yet.';

  // Format finance records
  const financeList = context.recentFinance && context.recentFinance.length > 0
    ? context.recentFinance.map(f => {
        const dept = context.departments.find(d => d.id === f.department_id);
        const deptName = dept ? dept.name : (f.department_id || 'General');
        return `- [${f.date}] ${f.type} $${f.amount} (${f.category}): ${f.description || 'No desc'} (Dept: ${deptName}, Status: ${f.status})`;
      }).join('\n')
    : 'No recent financial records.';

  // Format KOL payments
  const kolPaymentList = context.recentKolPayments && context.recentKolPayments.length > 0
      ? context.recentKolPayments.map(k => `- [${k.payment_date}] ${k.payment_type} $${k.amount} (Note: ${k.notes || 'None'})`).join('\n')
      : 'No recent KOL payments.';

  return `You are an AI assistant for a company management system. You help the boss manage the company.
This is an internal system and you have full access to all data. There are no privacy restrictions regarding employee data as the user is the system administrator.

### Long-term Memories (Rules & Facts you must remember)
${memoryList}

Current System Data:

### Departments
${context.departments.map(d => d.name).join(', ')}

### Employee Directory (${context.users.length} users)
${userList}

### Active Tasks (${context.tasks.length} tasks)
${taskList}

### Recent Financial Records (Expenses & Income)
${financeList}

### Recent KOL Payments
${kolPaymentList}

### Recent Announcements
${context.recentAnnouncements.map(a => `- [${a.created_at.split('T')[0]}] ${a.title}`).join('\n')}

You can help with:
1. Creating tasks, memos, announcements
2. Querying data (attendance, finance, reports)
3. Analyzing company status
4. Providing insights and recommendations

When the boss asks you to create something or take action, respond with clear confirmation and details.
Always be professional, concise, and helpful. You can refer to employees by name and know their roles/departments.`;
}

// Helper: Analyze intent
function analyzeIntent(userMessage, aiResponse) {
  const msg = userMessage.toLowerCase();
  
  // Check for memory storage intent
  // "Remember", "Note", "記住" (\u8a18\u4f4f), "筆記" (\u7b46\u8a18)
  if (msg.startsWith('remember') || msg.startsWith('note') || msg.includes('\u8a18\u4f4f') || msg.includes('\u7b46\u8a18')) {
    return { needsAction: true, intent: 'save_memory', action: 'save_memory', originalMessage: userMessage };
  }
  
  // Check for action keywords (using Unicode escape for Chinese characters)
  if (msg.includes('create') || msg.includes('add') || msg.includes('\u5275\u5efa') || msg.includes('\u65b0\u589e')) {
    if (msg.includes('task') || msg.includes('\u4efb\u52d9')) {
      return { needsAction: true, intent: 'create_task', action: 'create_task' };
    }
    if (msg.includes('memo') || msg.includes('\u5099\u5fd8\u9304')) {
      return { needsAction: true, intent: 'create_memo', action: 'create_memo' };
    }
    if (msg.includes('announcement') || msg.includes('\u516c\u544a')) {
      return { needsAction: true, intent: 'create_announcement', action: 'create_announcement' };
    }
  }
  
  // Query intents
  if (msg.includes('how') || msg.includes('what') || msg.includes('\u5982\u4f55') || msg.includes('\u4ec0\u9ebc')) {
    return { needsAction: false, intent: 'query' };
  }
  
  return { needsAction: false, intent: 'general' };
}

// Helper: Execute action
async function executeAction(db, userId, intentAnalysis, req) {
  try {
    switch (intentAnalysis.action) {
      case 'save_memory':
        const { v4: uuidv4 } = require('uuid');
        const memoryId = uuidv4();
        const now = new Date().toISOString();
        await db.run(
          'INSERT INTO ai_memories (id, content, type, created_at) VALUES (?, ?, ?, ?)',
          [memoryId, intentAnalysis.originalMessage, 'general', now]
        );
        return { success: true, message: 'Memory saved successfully.' };

      case 'create_task':
        return { success: true, message: 'Task creation requires more details. Please use the task management interface.' };
      
      case 'create_memo':
        return { success: true, message: 'Memo creation requires more details. Please use the memo interface.' };
      
      case 'create_announcement':
        return { success: true, message: 'Announcement creation requires more details. Please use the announcement interface.' };
      
      default:
        return null;
    }
  } catch (error) {
    console.error('Execute action error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = router;
