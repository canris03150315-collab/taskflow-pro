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
    const announcements = dbCall(db, 'prepare', 'SELECT * FROM announcements ORDER BY created_at DESC').all();
    res.json(announcements);
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { title, content, priority } = req.body;
    const id = `announcement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', 'INSERT INTO announcements (id, title, content, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, title, content, priority || 'NORMAL', now, now
    );
    
    const announcement = dbCall(db, 'prepare', 'SELECT * FROM announcements WHERE id = ?').get(id);
    res.json(announcement);
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const { title, content, priority } = req.body;
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', 'UPDATE announcements SET title = ?, content = ?, priority = ?, updated_at = ? WHERE id = ?').run(
      title, content, priority, now, id
    );
    
    const announcement = dbCall(db, 'prepare', 'SELECT * FROM announcements WHERE id = ?').get(id);
    res.json(announcement);
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    
    dbCall(db, 'prepare', 'DELETE FROM announcements WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

module.exports = router;
