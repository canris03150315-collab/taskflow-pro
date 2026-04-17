const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
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

function logOperation(db, operationType, targetType, targetId, userId, userName, changes) {
  try {
    const logId = uuidv4();
    const now = new Date().toISOString();
    dbCall(db, 'prepare', `
      INSERT INTO kol_operation_logs (id, operation_type, target_type, target_id, user_id, user_name, changes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(logId, operationType, targetType, targetId, userId, userName, JSON.stringify(changes), now);
  } catch (error) {
    console.error('Failed to log operation:', error);
  }
}

function checkKOLPermission(req, res, next) {
  const currentUser = req.user;
  if (!currentUser) {
    return res.status(403).json({ error: '權限不足' });
  }
  next();
}

// GET /profiles - Get KOL list (simplified for weekly system)
router.get('/profiles', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { status, search } = req.query;
    
    const userDept = req.query.departmentId || currentUser.department;
    let query = 'SELECT * FROM kol_profiles WHERE (department_id = ? OR department_id IS NULL)';
    const params = [userDept];
    
    if (status && status !== 'ALL') {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (search) {
      query += ' AND (platform_id LIKE ? OR platform_account LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY updated_at DESC';
    
    const profiles = dbCall(db, 'prepare', query).all(...params);
    
    res.json({ profiles });
  } catch (error) {
    console.error('Get KOL profiles error:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /stats - Get statistics (simplified for weekly system)
router.get('/stats', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    
    const userDept = req.query.departmentId || currentUser.department;
    const totalKOLs = dbCall(db, 'prepare', 'SELECT COUNT(*) as count FROM kol_profiles WHERE department_id = ? OR department_id IS NULL').get(userDept).count;
    const activeKOLs = dbCall(db, 'prepare', 'SELECT COUNT(*) as count FROM kol_profiles WHERE status_color = ? AND (department_id = ? OR department_id IS NULL)').get('green', userDept).count;
    const pausedKOLs = dbCall(db, 'prepare', 'SELECT COUNT(*) as count FROM kol_profiles WHERE status_color = ? AND (department_id = ? OR department_id IS NULL)').get('yellow', userDept).count;
    const stoppedKOLs = dbCall(db, 'prepare', 'SELECT COUNT(*) as count FROM kol_profiles WHERE status_color = ? AND (department_id = ? OR department_id IS NULL)').get('red', userDept).count;
    
    res.json({
      totalKOLs,
      activeKOLs,
      pausedKOLs,
      stoppedKOLs
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /profiles - Create new KOL
router.post('/profiles', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { platform, platformId, facebookId, platformAccount, contactInfo, status, statusColor, weeklyPayNote, notes } = req.body;
    
    const actualPlatformId = platformId || facebookId;
    if (!actualPlatformId || !platformAccount) {
      return res.status(400).json({ error: '缺少必要欄位' });
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', `
      INSERT INTO kol_profiles (id, platform, platform_id, facebook_id, platform_account, contact_info, status, status_color, weekly_pay_note, notes, created_at, updated_at, created_by, department_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, platform || 'FACEBOOK', actualPlatformId, actualPlatformId, platformAccount, contactInfo || null, status || 'ACTIVE', statusColor || 'green', weeklyPayNote || null, notes || null, now, now, currentUser.id, req.body.departmentId || currentUser.department);
    
    logOperation(db, 'CREATE', 'KOL_PROFILE', id, currentUser.id, currentUser.name, { platform, platformId: actualPlatformId, platformAccount });
    
    const profile = dbCall(db, 'prepare', 'SELECT * FROM kol_profiles WHERE id = ?').get(id);
    res.json({ profile });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /profiles/:id - Get KOL details
router.get('/profiles/:id', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    
    const profile = dbCall(db, 'prepare', 'SELECT * FROM kol_profiles WHERE id = ?').get(id);
    if (!profile) {
      return res.status(404).json({ error: '找不到該資料' });
    }
    
    res.json({ profile });
  } catch (error) {
    console.error('Get profile details error:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// PUT /profiles/:id - Update KOL
router.put('/profiles/:id', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const { platformId, facebookId, platformAccount, contactInfo, status, statusColor, weeklyPayNote, notes } = req.body;
    const actualPlatformId = platformId || facebookId;
    
    const profile = dbCall(db, 'prepare', 'SELECT * FROM kol_profiles WHERE id = ?').get(id);
    if (!profile) {
      return res.status(404).json({ error: '找不到該資料' });
    }
    
    const now = new Date().toISOString();
    const finalPlatformId = actualPlatformId || profile.platform_id;
    const finalAccount = platformAccount !== undefined ? platformAccount : profile.platform_account;
    const finalContact = contactInfo !== undefined ? contactInfo : profile.contact_info;
    const finalStatus = status !== undefined ? status : profile.status;
    const finalColor = statusColor !== undefined ? statusColor : profile.status_color;
    const finalPayNote = weeklyPayNote !== undefined ? weeklyPayNote : profile.weekly_pay_note;
    const finalNotes = notes !== undefined ? notes : profile.notes;
    dbCall(db, 'prepare', `
      UPDATE kol_profiles
      SET platform_id = ?, facebook_id = ?, platform_account = ?, contact_info = ?, status = ?, status_color = ?, weekly_pay_note = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(finalPlatformId, finalPlatformId, finalAccount, finalContact, finalStatus, finalColor, finalPayNote, finalNotes, now, id);
    
    logOperation(db, 'UPDATE', 'KOL_PROFILE', id, currentUser.id, currentUser.name, { platformId: actualPlatformId, platformAccount });
    
    const updated = dbCall(db, 'prepare', 'SELECT * FROM kol_profiles WHERE id = ?').get(id);
    res.json({ profile: updated });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// DELETE /profiles/:id - Delete KOL
router.delete('/profiles/:id', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    
    const profile = dbCall(db, 'prepare', 'SELECT * FROM kol_profiles WHERE id = ?').get(id);
    if (!profile) {
      return res.status(404).json({ error: '找不到該資料' });
    }
    
    dbCall(db, 'prepare', 'DELETE FROM kol_operation_logs WHERE target_id = ?').run(id);
    dbCall(db, 'prepare', 'DELETE FROM kol_profiles WHERE id = ?').run(id);
    
    logOperation(db, 'DELETE', 'KOL_PROFILE', id, currentUser.id, currentUser.name, { platformId: profile.platform_id });
    
    res.json({ success: true, message: '資料已刪除' });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /import-excel - Import KOL data from Excel (simplified)
router.post('/import-excel', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { data } = req.body;
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: '未提供資料' });
    }
    
    const results = { success: 0, failed: 0, errors: [] };
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        if (!row.platformId && !row.platformAccount) {
          results.failed++;
          results.errors.push({ row: i + 1, error: '缺少必要欄位' });
          continue;
        }
        
        const now = new Date().toISOString();
        const existing = dbCall(db, 'prepare', 'SELECT id FROM kol_profiles WHERE platform_id = ? OR platform_account = ?').get(row.platformId || row.platformAccount, row.platformAccount || row.platformId);
        
        if (existing) {
          dbCall(db, 'prepare', `UPDATE kol_profiles SET contact_info = ?, status = ?, status_color = ?, weekly_pay_note = ?, notes = ?, updated_at = ? WHERE id = ?`).run(
            row.contactInfo || null, row.status || 'ACTIVE', row.statusColor || 'green', row.weeklyPayNote || null, row.notes || null, now, existing.id
          );
          results.success++;
        } else {
          const kolId = uuidv4();
          dbCall(db, 'prepare', `INSERT INTO kol_profiles (id, platform, platform_id, facebook_id, platform_account, contact_info, status, status_color, weekly_pay_note, notes, created_at, updated_at, created_by, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            kolId, row.platform || 'FACEBOOK', row.platformId || row.platformAccount, row.platformId || row.platformAccount, row.platformAccount || row.platformId, row.contactInfo || null, row.status || 'ACTIVE', row.statusColor || 'green', row.weeklyPayNote || null, row.notes || null, now, now, currentUser.id, row.departmentId || currentUser.department
          );
          results.success++;
        }
        
        logOperation(db, 'IMPORT', 'KOL_PROFILE', 'EXCEL_IMPORT', currentUser.id, currentUser.name, { row: i + 1 });
      } catch (error) {
        results.failed++;
        results.errors.push({ row: i + 1, error: error.message });
      }
    }
    
    res.json({ success: true, results, message: `Imported ${results.success} records, ${results.failed} failed` });
  } catch (error) {
    console.error('Excel import error:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /export-excel - Export KOL data to Excel (simplified)
router.get('/export-excel', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const profiles = dbCall(db, 'prepare', 'SELECT * FROM kol_profiles ORDER BY updated_at DESC').all();
    
    res.json({ profiles });
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});


// ==================== Payment Routes ====================

// POST /payments - Create payment record
router.post('/payments', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { kolId, amount, paymentDate, notes } = req.body;
    
    if (!kolId || !amount || !paymentDate) {
      return res.status(400).json({ error: '缺少必要欄位' });
    }
    
    const kol = dbCall(db, 'prepare', 'SELECT * FROM kol_profiles WHERE id = ?').get(kolId);
    if (!kol) {
      return res.status(404).json({ error: '找不到該 KOL' });
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', `
      INSERT INTO kol_weekly_payments (id, kol_id, amount, payment_date, notes, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, kolId, amount, paymentDate, notes || null, now, currentUser.id);
    
    logOperation(db, 'CREATE', 'KOL_PAYMENT', id, currentUser.id, currentUser.name, { kolId, amount, paymentDate });
    
    const payment = dbCall(db, 'prepare', 'SELECT * FROM kol_weekly_payments WHERE id = ?').get(id);
    res.json({ payment });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /profiles/:kolId/payments - Get payment records for a KOL
router.get('/profiles/:kolId/payments', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const { kolId } = req.params;
    const { startDate, endDate } = req.query;
    
    const kol = dbCall(db, 'prepare', 'SELECT * FROM kol_profiles WHERE id = ?').get(kolId);
    if (!kol) {
      return res.status(404).json({ error: '找不到該 KOL' });
    }
    
    let query = 'SELECT * FROM kol_weekly_payments WHERE kol_id = ?';
    const params = [kolId];
    
    if (startDate) {
      query += ' AND payment_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND payment_date <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY payment_date DESC';
    
    const payments = dbCall(db, 'prepare', query).all(...params);
    
    const total = payments.reduce((sum, p) => sum + p.amount, 0);
    
    res.json({ payments, total });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /payment-stats - Get payment statistics (Enhanced)
router.get('/payment-stats', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const { startDate, endDate, departmentId } = req.query;

    let query = 'SELECT SUM(amount) as total, COUNT(*) as count FROM kol_weekly_payments WHERE 1=1';
    const params = [];

    if (startDate) {
      query += ' AND payment_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND payment_date <= ?';
      params.push(endDate);
    }

    if (departmentId) {
      query += ' AND kol_id IN (SELECT id FROM kol_profiles WHERE department_id = ?)';
      params.push(departmentId);
    }

    const result = dbCall(db, 'prepare', query).get(...params);
    const total = result.total || 0;
    const count = result.count || 0;
    const average = count > 0 ? Math.round(total / count) : 0;

    let byKolQuery = 'SELECT p.kol_id, k.platform_id, SUM(p.amount) as total FROM kol_weekly_payments p LEFT JOIN kol_profiles k ON p.kol_id = k.id WHERE 1=1';
    const byKolParams = [];

    if (startDate) {
      byKolQuery += ' AND p.payment_date >= ?';
      byKolParams.push(startDate);
    }

    if (endDate) {
      byKolQuery += ' AND p.payment_date <= ?';
      byKolParams.push(endDate);
    }

    if (departmentId) {
      byKolQuery += ' AND k.department_id = ?';
      byKolParams.push(departmentId);
    }

    byKolQuery += ' GROUP BY p.kol_id, k.platform_id ORDER BY total DESC LIMIT 10';

    const byKol = dbCall(db, 'prepare', byKolQuery).all(...byKolParams);

    res.json({ 
      total: total,
      count: count,
      average: average,
      byKol: byKol.map(function(item) {
        return {
          kolId: item.kol_id,
          platformId: item.platform_id,
          total: item.total
        };
      })
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
})

// PUT /payments/:id - Update payment record
router.put('/payments/:id', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const { amount, paymentDate, notes } = req.body;
    
    const payment = dbCall(db, 'prepare', 'SELECT * FROM kol_weekly_payments WHERE id = ?').get(id);
    if (!payment) {
      return res.status(404).json({ error: '找不到該付款紀錄' });
    }
    
    const isBossOrManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';
    const isCreator = payment.created_by === currentUser.id;
    
    if (!isBossOrManager && !isCreator) {
      return res.status(403).json({ error: '權限不足，僅建立者或主管可編輯' });
    }
    
    const now = new Date().toISOString();
    dbCall(db, 'prepare', `
      UPDATE kol_weekly_payments 
      SET amount = ?, payment_date = ?, notes = ?, updated_at = ?, updated_by = ?
      WHERE id = ?
    `).run(amount, paymentDate, notes || null, now, currentUser.id, id);
    
    logOperation(db, 'UPDATE', 'KOL_PAYMENT', id, currentUser.id, currentUser.name, { amount, paymentDate });
    
    const updated = dbCall(db, 'prepare', 'SELECT * FROM kol_weekly_payments WHERE id = ?').get(id);
    res.json({ payment: updated });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// DELETE /payments/:id - Delete payment record
router.delete('/payments/:id', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    
    const payment = dbCall(db, 'prepare', 'SELECT * FROM kol_weekly_payments WHERE id = ?').get(id);
    if (!payment) {
      return res.status(404).json({ error: '找不到該付款紀錄' });
    }
    
    const isBossOrManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';
    const isCreator = payment.created_by === currentUser.id;
    
    if (!isBossOrManager && !isCreator) {
      return res.status(403).json({ error: '權限不足，僅建立者或主管可刪除' });
    }
    
    dbCall(db, 'prepare', 'DELETE FROM kol_weekly_payments WHERE id = ?').run(id);
    
    logOperation(db, 'DELETE', 'KOL_PAYMENT', id, currentUser.id, currentUser.name, { amount: payment.amount });
    
    res.json({ success: true, message: '付款紀錄已刪除' });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});


module.exports = router;
