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
  throw new Error('Method ' + method + ' not found on database object');
}

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

router.post('/templates', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id, departmentId, title, items, lastUpdated, isDaily } = req.body;
    
    const itemsJson = JSON.stringify(items || []);
    const isDailyInt = isDaily ? 1 : 0;
    
    const existing = dbCall(db, 'prepare', 'SELECT id FROM routine_templates WHERE id = ?').get(id);
    
    if (existing) {
      dbCall(db, 'prepare', 'UPDATE routine_templates SET department_id = ?, title = ?, items = ?, last_updated = ?, is_daily = ? WHERE id = ?').run(departmentId, title, itemsJson, lastUpdated, isDailyInt, id);
    } else {
      dbCall(db, 'prepare', 'INSERT INTO routine_templates (id, department_id, title, items, last_updated, is_daily, read_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, departmentId, title, itemsJson, lastUpdated, isDailyInt, '[]');
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


router.post('/templates/:id/read', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const { userId } = req.body;
    
    const template = dbCall(db, 'prepare', 'SELECT * FROM routine_templates WHERE id = ?').get(id);
    
    if (!template) {
      return res.status(404).json({ error: '\u6a21\u677f\u4e0d\u5b58\u5728' });
    }
    
    let readBy = JSON.parse(template.read_by || '[]');
    if (!readBy.includes(userId)) {
      readBy.push(userId);
      dbCall(db, 'prepare', 'UPDATE routine_templates SET read_by = ? WHERE id = ?').run(JSON.stringify(readBy), id);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

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

router.get('/today', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const userId = currentUser.id;
    const userDept = currentUser.department;
    const today = new Date().toISOString().split('T')[0];

    let existing = await dbCall(db, 'get', 
      'SELECT * FROM routine_records WHERE user_id = ? AND date = ? AND department_id = ?',
      [userId, today, userDept]
    );

    if (!existing) {
      const templates = await dbCall(db, 'all',
        'SELECT * FROM routine_templates WHERE department_id = ? AND is_daily = 1',
        [userDept]
      );

      if (templates && templates.length > 0) {
        const template = templates[0];
        const recordId = 'routine-' + Date.now();
        const now = new Date().toISOString();
        const items = JSON.parse(template.items || '[]').map(text => ({ text, completed: false }));

        await dbCall(db, 'run',
          'INSERT INTO routine_records (id, user_id, department_id, template_id, date, completed_items, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [recordId, userId, userDept, template.id, today, JSON.stringify(items), now]
        );

        existing = {
          id: recordId,
          user_id: userId,
          department_id: userDept,
          template_id: template.id,
          date: today,
          completed_items: JSON.stringify(items),
          created_at: now
        };
      }
    }

    if (!existing) {
      return res.json(null);
    }

    const record = {
      id: existing.id,
      userId: existing.user_id,
      templateId: existing.template_id,
      date: existing.date,
      items: JSON.parse(existing.completed_items || '[]'),
      completedAt: existing.completed_at
    };

    res.json(record);
  } catch (error) {
    console.error('Error in GET /today:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});




// GET /history - Get routine history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;
    const userDept = req.user.department;
    const userRole = req.user.role;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    
    // Query different scope based on role
    let records;
    if (userRole === 'SUPERVISOR') {
      // SUPERVISOR: Return all department records
      records = dbCall(db, 'prepare',
        'SELECT * FROM routine_records WHERE department_id = ? AND date >= ? ORDER BY date DESC'
      ).all(userDept, startDate);
    } else if (userRole === 'BOSS' || userRole === 'MANAGER') {
      // BOSS/MANAGER: Return all records
      records = dbCall(db, 'prepare',
        'SELECT * FROM routine_records WHERE date >= ? ORDER BY date DESC'
      ).all(startDate);
    } else {
      // EMPLOYEE: Return only own records
      records = dbCall(db, 'prepare',
        'SELECT * FROM routine_records WHERE user_id = ? AND department_id = ? AND date >= ? ORDER BY date DESC'
      ).all(userId, userDept, startDate);
    }
    
    const mappedRecords = records.map(r => ({
      id: r.id,
      user_id: r.user_id,
      department_id: r.department_id,
      date: r.date,
      items: JSON.parse(r.completed_items || '[]')
    }));
    
    res.json({ records: mappedRecords });
  } catch (error) {
    console.error('Get routine history error:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

router.post('/records/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const { index, isCompleted } = req.body;
    
    const record = dbCall(db, 'prepare', 'SELECT * FROM routine_records WHERE id = ?').get(id);
    
    if (!record) {
      return res.status(404).json({ error: '\u8a18\u9304\u4e0d\u5b58\u5728' });
    }
    
    let completedItems = JSON.parse(record.completed_items || '[]');
    if (typeof completedItems[index] === 'object' && completedItems[index] !== null) { completedItems[index].completed = isCompleted; } else { completedItems[index] = { text: '', completed: isCompleted }; }
    
    dbCall(db, 'prepare', 'UPDATE routine_records SET completed_items = ? WHERE id = ?').run(JSON.stringify(completedItems), id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Toggle item error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});


router.post('/records/:recordId/toggle', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { recordId } = req.params;
    const { index, isCompleted } = req.body;
    
    const record = await dbCall(db, 'get', 'SELECT * FROM routine_records WHERE id = ?', [recordId]);
    
    if (!record) {
      return res.status(404).json({ error: '找不到該紀錄' });
    }
    
    const items = JSON.parse(record.completed_items || '[]');
    
    if (index < 0 || index >= items.length) {
      return res.status(400).json({ error: '無效的索引' });
    }
    
    items[index].completed = isCompleted;
    
    await dbCall(db, 'run', 
      'UPDATE routine_records SET completed_items = ? WHERE id = ?',
      [JSON.stringify(items), recordId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error in toggle:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

module.exports = { routineRoutes: router };


