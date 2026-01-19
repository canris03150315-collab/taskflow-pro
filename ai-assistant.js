const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

// Database helper
function dbCall(db, method, ...args) {
  if (typeof db[method] === 'function') {
    return db[method](...args);
  }
  throw new Error(`Method ${method} not found on database object`);
}

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
    
    const conversations = dbCall(db, 'prepare', 
      'SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(userId, limit);
    
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
    
    dbCall(db, 'prepare',
      'INSERT INTO ai_conversations (id, user_id, role, message, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(userMsgId, userId, 'user', message, now);
    
    // Get recent conversation history for context
    const recentConversations = dbCall(db, 'prepare',
      'SELECT role, message FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT 10'
    ).all(userId);
    
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
      throw new Error('Gemini API error: ' + response.statusText);
    }
    
    const data = await response.json();
    const aiResponse = data.candidates[0].content.parts[0].text;
    
    // Analyze intent and check if action is needed
    const intentAnalysis = analyzeIntent(message, aiResponse);
    
    let actionResult = null;
    if (intentAnalysis.needsAction) {
      actionResult = await executeAction(db, userId, intentAnalysis, req);
    }
    
    // Save AI response
    const aiMsgId = uuidv4();
    dbCall(db, 'prepare',
      'INSERT INTO ai_conversations (id, user_id, role, message, intent, action_taken, action_result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(aiMsgId, userId, 'assistant', aiResponse, 
      intentAnalysis.intent || null,
      intentAnalysis.action || null,
      actionResult ? JSON.stringify(actionResult) : null,
      now);
    
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
    
    dbCall(db, 'prepare',
      'DELETE FROM ai_conversations WHERE id = ? AND user_id = ?'
    ).run(id, userId);
    
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
    
    dbCall(db, 'prepare',
      'DELETE FROM ai_conversations WHERE user_id = ?'
    ).run(userId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Clear conversations error:', error);
    res.status(500).json({ error: 'Failed to clear conversations' });
  }
});

// Helper: Get system context
async function getSystemContext(db) {
  const context = {
    users: dbCall(db, 'prepare', 'SELECT id, name, role, department FROM users').all(),
    departments: dbCall(db, 'prepare', 'SELECT id, name FROM departments').all(),
    tasks: dbCall(db, 'prepare', 'SELECT id, title, status, priority FROM tasks WHERE status != "Completed" LIMIT 20').all(),
    recentAnnouncements: dbCall(db, 'prepare', 'SELECT id, title, created_at FROM announcements ORDER BY created_at DESC LIMIT 5').all()
  };
  return context;
}

// Helper: Build system prompt
function buildSystemPrompt(context) {
  return `You are an AI assistant for a company management system. You help the boss manage the company.

Current system data:
- Total users: ${context.users.length}
- Departments: ${context.departments.map(d => d.name).join(', ')}
- Active tasks: ${context.tasks.length}

You can help with:
1. Creating tasks, memos, announcements
2. Querying data (attendance, finance, reports)
3. Analyzing company status
4. Providing insights and recommendations

When the boss asks you to create something or take action, respond with clear confirmation and details.
Always be professional, concise, and helpful.`;
}

// Helper: Analyze intent
function analyzeIntent(userMessage, aiResponse) {
  const msg = userMessage.toLowerCase();
  
  // Check for action keywords
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
      case 'create_task':
        // This would integrate with tasks API
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
