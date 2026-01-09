const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

function dbCall(db, method, ...args) {
  if (typeof db[method] === 'function') {
    return db[method](...args);
  }
  if (db.db && typeof db.db[method] === 'function') {
    return db.db[method](...args);
  }
  throw new Error(`Method ${method} not found on database object`);
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const posts = dbCall(db, 'prepare', 'SELECT * FROM forum ORDER BY created_at DESC').all();
    res.json(posts);
  } catch (error) {
    console.error('Get forum error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { title, content, category } = req.body;
    const id = `forum-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const userId = req.user.id;
    
    dbCall(db, 'prepare', 'INSERT INTO forum (id, title, content, category, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      id, title, content, category || 'GENERAL', userId, now, now
    );
    
    const post = dbCall(db, 'prepare', 'SELECT * FROM forum WHERE id = ?').get(id);
    res.json(post);
  } catch (error) {
    console.error('Create forum post error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const { title, content, category } = req.body;
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', 'UPDATE forum SET title = ?, content = ?, category = ?, updated_at = ? WHERE id = ?').run(
      title, content, category, now, id
    );
    
    const post = dbCall(db, 'prepare', 'SELECT * FROM forum WHERE id = ?').get(id);
    res.json(post);
  } catch (error) {
    console.error('Update forum post error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    
    dbCall(db, 'prepare', 'DELETE FROM forum WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete forum post error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

module.exports = router;
