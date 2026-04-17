const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const FinanceService = require('../../services/financeService');
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
    const records = await FinanceService.getAllRecords(db);
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
    
    // ===== ????????? =====
    console.log('=== Finance POST Request ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Amount type:', typeof req.body.amount);
    console.log('Amount value:', req.body.amount);
    console.log('Description:', req.body.description);
    // ===========================
    
    const { type, amount, description, category, date, departmentId, scope, ownerId, recordedBy, attachment } = req.body;

    const finalAmount = Number(amount);

    // E5 fix: Amount must be positive and within reasonable range
    if (isNaN(finalAmount) || finalAmount <= 0) {
        return res.status(400).json({ error: '金額必須為正數' });
    }
    if (finalAmount > 999999999) {
        return res.status(400).json({ error: '金額超出允許範圍' });
    }

    const id = `finance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const userId = currentUser?.id || 'system';
    const deptId = departmentId || currentUser?.departmentId || null;
    const recordDate = date || new Date().toISOString().split('T')[0];

    const record = await FinanceService.createRecord(db, {
      type,
      amount: finalAmount,
      description,
      category,
      userId,
      departmentId: deptId,
      date: recordDate,
      scope,
      ownerId,
      recordedBy,
      attachment
    });
    
    console.log('Inserted record amount:', record.amount);
    console.log('========================\n');
    
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
    const { type, amount, description, category, date, status } = req.body;
    const now = new Date().toISOString();

    const updateData = {};
    if (type !== undefined) updateData.type = type;
    if (amount !== undefined) updateData.amount = amount;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (date !== undefined) updateData.date = date;
    if (status !== undefined) updateData.status = status;
    
    const record = await FinanceService.updateRecord(db, id, updateData);
    res.json(mapFinanceRecord(record));
  } catch (error) {
    console.error('Confirm finance error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});



// Confirm finance record receipt
router.post('/:id/confirm', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const currentUser = req.user;
    
    const now = new Date().toISOString();
    
    // Update record status to confirmed
    const updateData = {
      status: 'CONFIRMED',
      confirmedBy: currentUser.id,
      confirmedAt: now
    };
    
    const record = await FinanceService.updateRecord(db, id, updateData);
    res.json(mapFinanceRecord(record));
    
  } catch (error) {
    console.error('Confirm finance error:', error);
    res.status(500).json({ error: '\u78ba\u8a8d\u5931\u6557' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    
    await FinanceService.deleteRecord(db, id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete finance error:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

exports.financeRoutes = router;

