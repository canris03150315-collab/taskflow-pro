const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

// Check if user is boss
function checkBossPermission(req, res, next) {
  const currentUser = req.user;
  if (currentUser.role !== 'BOSS') {
    return res.status(403).json({ error: '\u50c5\u9650BOSS\u53ef\u4f7f\u7528AI\u52a9\u7406' });
  }
  next();
}

// GET /conversations - Get conversation history
router.get('/conversations', authenticateToken, checkBossPermission, async (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    
    const conversations = await db.all(
      'SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );
    
    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: '\u7121\u6cd5\u53d6\u5f97\u5c0d\u8a71\u8a18\u9304' });
  }
});

// POST /query - Temporarily disabled
router.post('/query', authenticateToken, checkBossPermission, async (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: '\u8a0a\u606f\u4e0d\u80fd\u70ba\u7a7a' });
    }
    
    // Save user message
    const userMsgId = uuidv4();
    const timestamp = new Date().toISOString();
    
    await db.run(
      `INSERT INTO ai_conversations (id, user_id, role, message, created_at) VALUES (?, ?, ?, ?, ?)`,
      [userMsgId, userId, 'user', message, timestamp]
    );
    
    // Return friendly maintenance message instead of calling Gemini API
    const aiResponse = '\ud83d\udd27 AI \u667a\u80fd\u52a9\u7406\u529f\u80fd\u76ee\u524d\u6b63\u5728\u5347\u7d1a\u7dad\u8b77\u4e2d\uff0c\u9810\u8a08\u5f88\u5feb\u5c31\u6703\u4e0a\u7dda\u3002\n\n\u6211\u5011\u6b63\u5728\u512a\u5316 AI \u670d\u52d9\u4ee5\u63d0\u4f9b\u66f4\u597d\u7684\u9ad4\u9a57\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002\u611f\u8b1d\u60a8\u7684\u8010\u5fc3\u7b49\u5019\uff01';
    
    // Save AI response
    const aiMsgId = uuidv4();
    await db.run(
      `INSERT INTO ai_conversations (id, user_id, role, message, created_at) VALUES (?, ?, ?, ?, ?)`,
      [aiMsgId, userId, 'assistant', aiResponse, new Date().toISOString()]
    );
    
    res.json({
      response: aiResponse,
      conversationId: userMsgId
    });
    
  } catch (error) {
    console.error('AI query error:', error);
    res.status(500).json({ error: '\u8655\u7406\u67e5\u8a62\u5931\u6557' });
  }
});

module.exports = router;
