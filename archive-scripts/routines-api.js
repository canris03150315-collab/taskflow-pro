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

// GET /api/routines/templates - 獲取所有模板
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const templates = dbCall(db, 'prepare', 'SELECT * FROM routine_templates ORDER BY last_updated DESC').all();
    
    const formatted = templates.map(t => ({
      id: t.id,
      departmentId: t.department_id,
      title: t.title,
      items: JSON.parse(t.items || '[]'),
      lastUpdated: t.last_updated,
      isDaily: t.is_daily === 1,
      readBy: JSON.parse(t.read_by || '[]')
    }));
    
    res.json({ templates: formatted });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

// POST /api/routines/templates - 保存模板
router.post('/templates', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id, departmentId, title, items, lastUpdated, isDaily } = req.body;
    
    const itemsJson = JSON.stringify(items || []);
    const isDailyInt = isDaily ? 1 : 0;
    
    // 檢查是否已存在
    const existing = dbCall(db, 'prepare', 'SELECT id FROM routine_templates WHERE id = ?').get(id);
    
    if (existing) {
      // 更新
      dbCall(db, 'prepare', `
        UPDATE routine_templates 
        SET department_id = ?, title = ?, items = ?, last_updated = ?, is_daily = ?
        WHERE id = ?
      `).run(departmentId, title, itemsJson, lastUpdated, isDailyInt, id);
    } else {
      // 新增
      dbCall(db, 'prepare', `
        INSERT INTO routine_templates (id, department_id, title, items, last_updated, is_daily, read_by)
        VALUES (?, ?, ?, ?, ?, ?, '[]')
      `).run(id, departmentId, title, itemsJson, lastUpdated, isDailyInt);
    }
    
    const saved = dbCall(db, 'prepare', 'SELECT * FROM routine_templates WHERE id = ?').get(id);
    
    res.json({
      id: saved.id,
      departmentId: saved.department_id,
      title: saved.title,
      items: JSON.parse(saved.items),
      lastUpdated: saved.last_updated,
      isDaily: saved.is_daily === 1,
      readBy: JSON.parse(saved.read_by || '[]')
    });
  } catch (error) {
    console.error('Save template error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

// DELETE /api/routines/templates/:id - 刪除模板
router.delete('/templates/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    
    dbCall(db, 'prepare', 'DELETE FROM routine_templates WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

// GET /api/routines/today - 獲取今日記錄
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    
    const record = dbCall(db, 'prepare', `
      SELECT * FROM routine_records 
      WHERE user_id = ? AND date = ?
    `).get(userId, today);
    
    if (record) {
      res.json({
        id: record.id,
        templateId: record.template_id,
        userId: record.user_id,
        departmentId: record.department_id,
        date: record.date,
        completedItems: JSON.parse(record.completed_items || '[]'),
        createdAt: record.created_at
      });
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error('Get today record error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

module.exports = { routineRoutes: router };
