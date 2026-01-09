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

function mapFinanceRecord(record) {
  if (!record) return record;
  return {
    id: record.id,
    type: record.type,
    amount: record.amount,
    category: record.category,
    description: record.description,
    userId: record.user_id,
    departmentId: record.department_id,
    date: record.date,
    status: record.status,
    confirmedBy: record.confirmed_by,
    confirmedAt: record.confirmed_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    scope: record.scope || 'DEPARTMENT',
    ownerId: record.owner_id,
    recordedBy: record.recorded_by,
    attachment: record.attachment
  };
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const records = dbCall(db, 'prepare', 'SELECT * FROM finance ORDER BY created_at DESC').all();
    const mappedRecords = records.map(mapFinanceRecord);
    res.json({ records: mappedRecords });
  } catch (error) {
    console.error('Get finance error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { type, amount, description, category, date, departmentId, scope, ownerId, recordedBy, attachment } = req.body;
    
    const id = `finance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const userId = currentUser?.id || 'system';
    const deptId = departmentId || currentUser?.departmentId || null;
    const recordDate = date || new Date().toISOString().split('T')[0];

    dbCall(db, 'prepare', 
      'INSERT INTO finance (id, type, amount, description, category, user_id, department_id, date, status, created_at, updated_at, scope, owner_id, recorded_by, attachment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      id, 
      type, 
      amount, 
      description || '', 
      category || 'OTHER', 
      userId,
      deptId,
      recordDate,
      'PENDING',
      now, 
      now,
      scope || 'DEPARTMENT',
      ownerId || null,
      recordedBy || userId,
      attachment || null
    );

    const record = dbCall(db, 'prepare', 'SELECT * FROM finance WHERE id = ?').get(id);
    res.json(mapFinanceRecord(record));
  } catch (error) {
    console.error('Create finance error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const { type, amount, description, category, status } = req.body;
    const now = new Date().toISOString();

    dbCall(db, 'prepare', 
      'UPDATE finance SET type = ?, amount = ?, description = ?, category = ?, status = ?, updated_at = ? WHERE id = ?'
    ).run(
      type, 
      amount, 
      description, 
      category, 
      status || 'PENDING',
      now, 
      id
    );

    const record = dbCall(db, 'prepare', 'SELECT * FROM finance WHERE id = ?').get(id);
    res.json(mapFinanceRecord(record));
  } catch (error) {
    console.error('Update finance error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;

    dbCall(db, 'prepare', 'DELETE FROM finance WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete finance error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

router.post('/:id/confirm', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const currentUser = req.user;
    const now = new Date().toISOString();

    dbCall(db, 'prepare', 
      'UPDATE finance SET status = ?, confirmed_by = ?, confirmed_at = ?, updated_at = ? WHERE id = ?'
    ).run('CONFIRMED', currentUser.id, now, now, id);

    const record = dbCall(db, 'prepare', 'SELECT * FROM finance WHERE id = ?').get(id);
    res.json(mapFinanceRecord(record));
  } catch (error) {
    console.error('Confirm finance error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

exports.financeRoutes = router;
