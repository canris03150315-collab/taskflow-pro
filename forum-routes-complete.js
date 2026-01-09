const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

function dbCall(db, method, ...args) {
  if (typeof db[method] === 'function') {
    return db[method](...args);
  }
  if (db.db && typeof db.db[method] === 'function') {
    return db.db[method](...args);
  }
  throw new Error(`Method ${method} not found on database object`);
}

function mapSuggestion(record) {
  if (!record) return record;
  return {
    id: record.id,
    title: record.title,
    content: record.content,
    category: record.category,
    authorId: record.author_id,
    targetDeptId: record.target_dept_id,
    isAnonymous: record.is_anonymous === 1,
    status: record.status,
    upvotes: JSON.parse(record.upvotes || '[]'),
    comments: JSON.parse(record.comments || '[]'),
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const suggestions = dbCall(db, 'prepare', 'SELECT * FROM suggestions ORDER BY created_at DESC').all();
    const mapped = suggestions.map(mapSuggestion);
    res.json({ suggestions: mapped });
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { title, content, category, isAnonymous, targetDeptId, authorId } = req.body;
    
    const id = `sug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', 
      'INSERT INTO suggestions (id, title, content, category, author_id, target_dept_id, is_anonymous, status, upvotes, comments, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      id,
      title,
      content,
      category || '\u5176\u4ed6',
      authorId || currentUser.id,
      targetDeptId || 'ALL',
      isAnonymous ? 1 : 0,
      'OPEN',
      '[]',
      '[]',
      now,
      now
    );
    
    const suggestion = dbCall(db, 'prepare', 'SELECT * FROM suggestions WHERE id = ?').get(id);
    res.json(mapSuggestion(suggestion));
  } catch (error) {
    console.error('Create suggestion error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const { title, content, category, status, upvotes, comments } = req.body;
    const now = new Date().toISOString();
    
    const updates = [];
    const values = [];
    
    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      values.push(content);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (upvotes !== undefined) {
      updates.push('upvotes = ?');
      values.push(JSON.stringify(upvotes));
    }
    if (comments !== undefined) {
      updates.push('comments = ?');
      values.push(JSON.stringify(comments));
    }
    
    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);
    
    dbCall(db, 'prepare', `UPDATE suggestions SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    
    const suggestion = dbCall(db, 'prepare', 'SELECT * FROM suggestions WHERE id = ?').get(id);
    res.json(mapSuggestion(suggestion));
  } catch (error) {
    console.error('Update suggestion error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    
    dbCall(db, 'prepare', 'DELETE FROM suggestions WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete suggestion error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const currentUser = req.user;
    const { content, is_official } = req.body;
    
    const suggestion = dbCall(db, 'prepare', 'SELECT * FROM suggestions WHERE id = ?').get(id);
    if (!suggestion) {
      return res.status(404).json({ error: '\u63d0\u6848\u4e0d\u5b58\u5728' });
    }
    
    const comments = JSON.parse(suggestion.comments || '[]');
    const newComment = {
      id: `c-${Date.now()}`,
      userId: currentUser.id,
      author_id: currentUser.id,
      content: content,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      isOfficialReply: is_official || false
    };
    
    comments.push(newComment);
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', 'UPDATE suggestions SET comments = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify(comments),
      now,
      id
    );
    
    res.json({ comment: newComment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

exports.forumRoutes = router;
