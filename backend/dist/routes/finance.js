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
    const currentUser = req.user;
    // 依角色回傳可見範圍：員工只看自己的個人記錄+本部門記錄，主管看本部門，BOSS/MANAGER 看全部
    const records = await FinanceService.getRecordsForUser(db, currentUser);
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
    const recordDate = date || new Date().toISOString().split('T')[0];

    // 依角色限制可建立的 scope / owner / department，防止員工偽造他人或部門記錄
    const role = currentUser?.role;
    let finalScope = scope || 'DEPARTMENT';
    let finalOwnerId = ownerId || null;
    let finalDeptId = departmentId || currentUser?.department || null;
    if (role === 'EMPLOYEE') {
      // 員工只能建立屬於自己的個人零用金記錄
      finalScope = 'PERSONAL';
      finalOwnerId = currentUser.id;
      finalDeptId = currentUser.department;
    } else if (role === 'SUPERVISOR') {
      if (finalScope === 'PERSONAL') {
        // 個人記錄的 owner 必須是自己或本部門成員
        if (finalOwnerId && finalOwnerId !== currentUser.id) {
          const owner = await db.get('SELECT department FROM users WHERE id = ?', [finalOwnerId]);
          if (!owner || owner.department !== currentUser.department) {
            return res.status(403).json({ error: '只能為自己部門的成員建立個人記錄' });
          }
          finalDeptId = owner.department;
        } else {
          finalOwnerId = currentUser.id;
          finalDeptId = currentUser.department;
        }
      } else {
        // 部門記錄限自己部門
        finalScope = 'DEPARTMENT';
        finalOwnerId = null;
        finalDeptId = currentUser.department;
      }
    }
    // BOSS / MANAGER：沿用傳入值，不額外限制

    const record = await FinanceService.createRecord(db, {
      type,
      amount: finalAmount,
      description,
      category,
      userId,
      departmentId: finalDeptId,
      date: recordDate,
      scope: finalScope,
      ownerId: finalOwnerId,
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
    const currentUser = req.user;
    const { type, amount, description, category, date, status } = req.body;
    const now = new Date().toISOString();

    // 授權：BOSS/MANAGER 全部；主管限本部門；員工限自己的個人記錄
    const existing = await FinanceService.getRecordById(db, id);
    if (!existing) {
      return res.status(404).json({ error: '找不到該筆記錄' });
    }
    const role = currentUser?.role;
    const canEdit =
      role === 'BOSS' || role === 'MANAGER' ||
      (role === 'SUPERVISOR' && existing.department_id === currentUser.department) ||
      (existing.scope === 'PERSONAL' && existing.owner_id === currentUser.id);
    if (!canEdit) {
      return res.status(403).json({ error: '權限不足' });
    }

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

    // 授權（對齊 UI 的 canConfirm）：BOSS/MANAGER 全部；主管確認本部門的部門記錄或有 MANAGE_FINANCE；個人記錄限擁有者本人
    const existing = await FinanceService.getRecordById(db, id);
    if (!existing) {
      return res.status(404).json({ error: '找不到該筆記錄' });
    }
    const role = currentUser?.role;
    const perms = currentUser?.permissions || [];
    const canConfirm =
      role === 'BOSS' || role === 'MANAGER' ||
      (existing.scope === 'DEPARTMENT' && existing.department_id === currentUser.department &&
        (role === 'SUPERVISOR' || perms.includes('MANAGE_FINANCE'))) ||
      (existing.scope === 'PERSONAL' && existing.owner_id === currentUser.id);
    if (!canConfirm) {
      return res.status(403).json({ error: '權限不足' });
    }

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
    const currentUser = req.user;

    // 授權（對齊 UI 的刪除規則）：只有 BOSS/MANAGER，或本部門的主管可刪；員工不可刪
    const existing = await FinanceService.getRecordById(db, id);
    if (!existing) {
      return res.status(404).json({ error: '找不到該筆記錄' });
    }
    const role = currentUser?.role;
    const canDelete =
      role === 'BOSS' || role === 'MANAGER' ||
      (role === 'SUPERVISOR' && existing.department_id === currentUser.department);
    if (!canDelete) {
      return res.status(403).json({ error: '權限不足' });
    }

    await FinanceService.deleteRecord(db, id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete finance error:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

exports.financeRoutes = router;

