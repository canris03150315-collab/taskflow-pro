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

function parseAnnouncementJson(ann) {
  if (!ann) return ann;
  
  try {
    ann.read_by = ann.read_by ? JSON.parse(ann.read_by) : [];
  } catch (e) {
    ann.read_by = [];
  }
  // Filter out null/undefined and deduplicate
  ann.read_by = [...new Set(ann.read_by.filter(x => x != null))];

  ann.createdBy = ann.created_by;
  ann.createdAt = ann.created_at;
  ann.updatedAt = ann.updated_at;
  ann.readBy = ann.read_by;
  
  return ann;
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const announcements = dbCall(db, 'prepare', 'SELECT * FROM announcements ORDER BY created_at DESC').all();
    
    const parsed = announcements.map(parseAnnouncementJson);
    
    res.json({ announcements: parsed });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { title, content, priority, createdBy, images } = req.body;

    // B12 fix: Validate title and content are non-empty
    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({ error: '標題和內容不可為空' });
    }

    const id = `announcement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const created_by = createdBy || req.user?.id || 'system';

    dbCall(db, 'prepare', 'INSERT INTO announcements (id, title, content, priority, created_by, created_at, updated_at, read_by, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, title, content, priority || 'NORMAL', created_by, now, now, '[]', JSON.stringify(images || [])
    );

    const announcement = dbCall(db, 'prepare', 'SELECT * FROM announcements WHERE id = ?').get(id);
    
    console.log('[Announcements] Broadcasting ANNOUNCEMENT_CREATED to all users');
    if (req.wsServer) {
      console.log('[Announcements] wsServer exists, broadcasting...');
      req.wsServer.broadcastToAll('ANNOUNCEMENT_CREATED', {
        announcement: parseAnnouncementJson(announcement),
        timestamp: new Date().toISOString()
      });
    }
    
    res.json(parseAnnouncementJson(announcement));
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const { title, content, priority, images } = req.body;
    const now = new Date().toISOString();

    dbCall(db, 'prepare', 'UPDATE announcements SET title = ?, content = ?, priority = ?, images = ?, updated_at = ? WHERE id = ?').run(
      title, content, priority, JSON.stringify(images || []), now, id
    );

    const announcement = dbCall(db, 'prepare', 'SELECT * FROM announcements WHERE id = ?').get(id);

    console.log('[Announcements] Broadcasting ANNOUNCEMENT_UPDATED to all users');
    if (req.wsServer) {
      console.log('[Announcements] wsServer exists, broadcasting...');
      req.wsServer.broadcastToAll('ANNOUNCEMENT_UPDATED', {
        announcement: parseAnnouncementJson(announcement),
        timestamp: new Date().toISOString()
      });
    }

    res.json(parseAnnouncementJson(announcement));
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const { userId } = req.body;

    const announcement = dbCall(db, 'prepare', 'SELECT * FROM announcements WHERE id = ?').get(id);
    if (!announcement) {
      return res.status(404).json({ error: '\u516c\u544a\u4e0d\u5b58\u5728' });
    }

    let readBy = [];
    try {
      readBy = announcement.read_by ? JSON.parse(announcement.read_by) : [];
    } catch (e) {
      readBy = [];
    }
    // Clean: filter null and deduplicate
    readBy = [...new Set(readBy.filter(x => x != null))];

    const actualUserId = userId || req.user?.id;
    if (actualUserId && !readBy.includes(actualUserId)) {
      readBy.push(actualUserId);
      const readByJson = JSON.stringify(readBy);
      dbCall(db, 'prepare', 'UPDATE announcements SET read_by = ? WHERE id = ?').run(readByJson, id);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const currentUser = req.user;

    // S11 fix: Only BOSS/MANAGER can delete announcements
    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER') {
      return res.status(403).json({ error: '權限不足，只有管理人員可刪除公告' });
    }

    dbCall(db, 'prepare', 'DELETE FROM announcements WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

exports.announcementsRoutes = router;

