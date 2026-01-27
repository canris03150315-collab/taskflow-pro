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
  // Allow all authenticated users to access KOL management
  if (!currentUser) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}

router.get('/profiles', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const { status, search } = req.query;
    
    const userDept = req.query.departmentId || currentUser.department;
    let query = 'SELECT * FROM kol_profiles WHERE (department_id = ? OR department_id IS NULL)';
    const params = [userDept];
    
    if (status && status !== 'ALL') {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (search) {
      query += ' AND (facebook_id LIKE ? OR platform_account LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY updated_at DESC';
    
    const profiles = dbCall(db, 'prepare', query).all(...params);
    
    const profilesWithStats = profiles.map(profile => {
      const contractCount = dbCall(db, 'prepare', 'SELECT COUNT(*) as count FROM kol_contracts WHERE kol_id = ?').get(profile.id).count;
      const activeContracts = dbCall(db, 'prepare', `SELECT COUNT(*) as count FROM kol_contracts WHERE kol_id = ? AND end_date >= date('now')`).get(profile.id).count;
      const totalUnpaid = dbCall(db, 'prepare', 'SELECT SUM(unpaid_amount) as total FROM kol_contracts WHERE kol_id = ?').get(profile.id).total || 0;
      
      return {
        ...profile,
        contractCount,
        activeContracts,
        totalUnpaid
      };
    });
    
    res.json({ profiles: profilesWithStats });
  } catch (error) {
    console.error('Get KOL profiles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    
    const userDept = req.query.departmentId || currentUser.department;
    const totalKOLs = dbCall(db, 'prepare', 'SELECT COUNT(*) as count FROM kol_profiles WHERE department_id = ? OR department_id IS NULL').get(userDept).count;
    const activeKOLs = dbCall(db, 'prepare', `SELECT COUNT(*) as count FROM kol_profiles WHERE status = 'ACTIVE' AND (department_id = ? OR department_id IS NULL)`).get(userDept).count;
    const activeContracts = dbCall(db, 'prepare', `SELECT COUNT(*) as count FROM kol_contracts WHERE end_date >= date('now') AND (department_id = ? OR department_id IS NULL)`).get(userDept).count;
    const totalUnpaid = dbCall(db, 'prepare', 'SELECT SUM(unpaid_amount) as total FROM kol_contracts WHERE department_id = ? OR department_id IS NULL').get(userDept).total || 0;
    
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const monthlyPayments = dbCall(db, 'prepare', 'SELECT SUM(amount) as total FROM kol_payments WHERE payment_date >= ? AND payment_date <= ?').get(firstDay, lastDay).total || 0;
    const monthlyContracts = dbCall(db, 'prepare', 'SELECT COUNT(*) as count FROM kol_contracts WHERE created_at >= ? AND created_at <= ?').get(firstDay, lastDay).count;
    
    res.json({
      totalKOLs,
      activeKOLs,
      activeContracts,
      totalUnpaid,
      monthlyPayments,
      monthlyContracts
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/profiles', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { platform, platformId, facebookId, platformAccount, contactInfo, status, notes } = req.body;
    
    const actualPlatformId = platformId || facebookId;
    if (!actualPlatformId || !platformAccount) {
      return res.status(400).json({ error: 'Required fields missing' });
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', `
      INSERT INTO kol_profiles (id, platform, platform_id, facebook_id, platform_account, contact_info, status, notes, created_at, updated_at, created_by, department_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, platform || 'FACEBOOK', actualPlatformId, actualPlatformId, platformAccount, contactInfo || null, status || 'ACTIVE', notes || null, now, now, currentUser.id, req.body.departmentId || currentUser.department);
    
    logOperation(db, 'CREATE', 'KOL_PROFILE', id, currentUser.id, currentUser.name, { platform, platformId: actualPlatformId, platformAccount });
    
    const profile = dbCall(db, 'prepare', 'SELECT * FROM kol_profiles WHERE id = ?').get(id);
    res.json({ profile });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/import-excel', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { data } = req.body;
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'No data provided' });
    }
    
    const results = { success: 0, failed: 0, errors: [] };
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        if (!row.facebookId && !row.platformAccount) {
          results.failed++;
          results.errors.push({ row: i + 1, error: 'Missing required fields (???ID or ??????)' });
          continue;
        }
        
        const now = new Date().toISOString();
        const existing = dbCall(db, 'prepare', 'SELECT id FROM kol_profiles WHERE facebook_id = ? OR platform_account = ?').get(row.facebookId || row.platformAccount, row.platformAccount || row.facebookId);
        
        if (existing) {
          dbCall(db, 'prepare', `UPDATE kol_profiles SET contact_info = ?, status = ?, notes = ?, updated_at = ? WHERE id = ?`).run(
            row.contactInfo || null, row.status || 'ACTIVE', row.notes || null, now, existing.id
          );
          
          if (row.salaryAmount) {
            const contractId = uuidv4();
            dbCall(db, 'prepare', `
              INSERT INTO kol_contracts (id, kol_id, start_date, end_date, salary_amount, deposit_amount, unpaid_amount, cleared_amount, total_paid, contract_type, notes, created_at, updated_at, created_by, department_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(contractId, existing.id, row.startDate || null, row.endDate || null, row.salaryAmount, row.depositAmount || 0, row.unpaidAmount || 0, row.clearedAmount || 0, row.totalPaid || 0, row.contractType || 'NORMAL', row.contractNotes || null, now, now, currentUser.id, row.departmentId || currentUser.department);
          }
          results.success++;
        } else {
          const kolId = uuidv4();
          dbCall(db, 'prepare', `INSERT INTO kol_profiles (id, facebook_id, platform_account, contact_info, status, notes, created_at, updated_at, created_by, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            kolId, row.facebookId || row.platformAccount, row.platformAccount || row.facebookId, row.contactInfo || null, row.status || 'ACTIVE', row.notes || null, now, now, currentUser.id, row.departmentId || currentUser.department
          );
          
          if (row.salaryAmount) {
            const contractId = uuidv4();
            dbCall(db, 'prepare', `
              INSERT INTO kol_contracts (id, kol_id, start_date, end_date, salary_amount, deposit_amount, unpaid_amount, cleared_amount, total_paid, contract_type, notes, created_at, updated_at, created_by, department_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(contractId, kolId, row.startDate || null, row.endDate || null, row.salaryAmount, row.depositAmount || 0, row.unpaidAmount || 0, row.clearedAmount || 0, row.totalPaid || 0, row.contractType || 'NORMAL', row.contractNotes || null, now, now, currentUser.id, row.departmentId || currentUser.department);
          }
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/export-excel', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const profiles = dbCall(db, 'prepare', `
      SELECT p.facebook_id, p.platform_account, p.contact_info, p.status, p.notes,
             c.start_date, c.end_date, c.salary_amount, c.deposit_amount, c.unpaid_amount,
             c.cleared_amount, c.total_paid, c.contract_type, c.notes as contract_notes
      FROM kol_profiles p
      LEFT JOIN kol_contracts c ON p.id = c.kol_id
      ORDER BY p.updated_at DESC
    `).all();
    
    res.json({ profiles });
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



router.get('/profiles/:id', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    
    const profile = dbCall(db, 'prepare', 'SELECT * FROM kol_profiles WHERE id = ?').get(id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const contracts = dbCall(db, 'prepare', 'SELECT * FROM kol_contracts WHERE kol_id = ? ORDER BY created_at DESC').all(id);
    const payments = dbCall(db, 'prepare', `
      SELECT p.* FROM kol_payments p
      JOIN kol_contracts c ON p.contract_id = c.id
      WHERE c.kol_id = ?
      ORDER BY p.payment_date DESC
    `).all(id);
    
    res.json({ profile, contracts, payments });
  } catch (error) {
    console.error('Get profile details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/profiles/:id', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    
    const profile = dbCall(db, 'prepare', 'SELECT * FROM kol_profiles WHERE id = ?').get(id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    // Delete related records first
    dbCall(db, 'prepare', 'DELETE FROM kol_payments WHERE contract_id IN (SELECT id FROM kol_contracts WHERE kol_id = ?)').run(id);
    dbCall(db, 'prepare', 'DELETE FROM kol_contracts WHERE kol_id = ?').run(id);
    dbCall(db, 'prepare', 'DELETE FROM kol_operation_logs WHERE target_id = ?').run(id);
    dbCall(db, 'prepare', 'DELETE FROM kol_profiles WHERE id = ?').run(id);
    
    logOperation(db, 'DELETE', 'KOL_PROFILE', id, currentUser.id, currentUser.name, { facebookId: profile.facebook_id });
    
    res.json({ success: true, message: 'Profile deleted successfully' });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/profiles/:id', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const { platformId, facebookId, platformAccount, contactInfo, status, statusColor, weeklyPayNote, notes } = req.body;
    const actualFacebookId = platformId || facebookId;
    
    const profile = dbCall(db, 'prepare', 'SELECT * FROM kol_profiles WHERE id = ?').get(id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const now = new Date().toISOString();
    dbCall(db, 'prepare', `
      UPDATE kol_profiles 
      SET facebook_id = ?, platform_account = ?, contact_info = ?, status = ?, status_color = ?, weekly_pay_note = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(actualFacebookId, platformAccount, contactInfo || null, status, statusColor || null, weeklyPayNote || null, notes || null, now, id);
    
    logOperation(db, 'UPDATE', 'KOL_PROFILE', id, currentUser.id, currentUser.name, { facebookId, platformAccount });
    
    const updated = dbCall(db, 'prepare', 'SELECT * FROM kol_profiles WHERE id = ?').get(id);
    res.json({ profile: updated });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});




// ==================== Contracts Management ====================

router.get('/contracts', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const { kolId } = req.query;
    
    let query = `
      SELECT c.*, p.facebook_id, p.platform_account, p.status as kol_status
      FROM kol_contracts c
      JOIN kol_profiles p ON c.kol_id = p.id
      WHERE 1=1
    `;
    const params = [];
    
    if (kolId) {
      query += ' AND c.kol_id = ?';
      params.push(kolId);
    }
    
    query += ' ORDER BY c.created_at DESC';
    
    const contracts = dbCall(db, 'prepare', query).all(...params);
    res.json({ contracts });
  } catch (error) {
    console.error('Get contracts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/contracts', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { kolId, startDate, endDate, salaryAmount, depositAmount, unpaidAmount, clearedAmount, totalPaid, contractType, notes } = req.body;
    
    if (!kolId || salaryAmount === undefined) {
      return res.status(400).json({ error: 'KOL ID and Salary Amount are required' });
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', `
      INSERT INTO kol_contracts (
        id, kol_id, start_date, end_date, salary_amount, deposit_amount, 
        unpaid_amount, cleared_amount, total_paid, contract_type, notes, 
        created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, kolId, startDate || null, endDate || null, salaryAmount, depositAmount || 0,
      unpaidAmount || salaryAmount, clearedAmount || 0, totalPaid || 0, contractType || 'NORMAL', 
      notes || null, now, now, currentUser.id
    );
    
    logOperation(db, 'CREATE', 'KOL_CONTRACT', id, currentUser.id, currentUser.name, { kolId, salaryAmount });
    
    const contract = dbCall(db, 'prepare', 'SELECT * FROM kol_contracts WHERE id = ?').get(id);
    res.json({ contract });
  } catch (error) {
    console.error('Create contract error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/contracts/:id', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const { startDate, endDate, salaryAmount, depositAmount, unpaidAmount, clearedAmount, totalPaid, contractType, notes } = req.body;
    
    const existing = dbCall(db, 'prepare', 'SELECT * FROM kol_contracts WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', `
      UPDATE kol_contracts 
      SET start_date = ?, end_date = ?, salary_amount = ?, deposit_amount = ?, 
          unpaid_amount = ?, cleared_amount = ?, total_paid = ?, contract_type = ?, 
          notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
      startDate || null, endDate || null, salaryAmount, depositAmount,
      unpaidAmount, clearedAmount, totalPaid, contractType, notes || null, now, id
    );
    
    logOperation(db, 'UPDATE', 'KOL_CONTRACT', id, currentUser.id, currentUser.name, { old: existing, new: req.body });
    
    const contract = dbCall(db, 'prepare', 'SELECT * FROM kol_contracts WHERE id = ?').get(id);
    res.json({ contract });
  } catch (error) {
    console.error('Update contract error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/contracts/:id', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    
    const existing = dbCall(db, 'prepare', 'SELECT * FROM kol_contracts WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    dbCall(db, 'prepare', 'DELETE FROM kol_payments WHERE contract_id = ?').run(id);
    dbCall(db, 'prepare', 'DELETE FROM kol_contracts WHERE id = ?').run(id);
    
    logOperation(db, 'DELETE', 'KOL_CONTRACT', id, currentUser.id, currentUser.name, { deleted: existing });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete contract error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Payments Management ====================

router.get('/payments', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const { contractId } = req.query;
    
    let query = `
      SELECT p.*, c.kol_id, k.facebook_id, k.platform_account
      FROM kol_payments p
      JOIN kol_contracts c ON p.contract_id = c.id
      JOIN kol_profiles k ON c.kol_id = k.id
      WHERE 1=1
    `;
    const params = [];
    
    if (contractId) {
      query += ' AND p.contract_id = ?';
      params.push(contractId);
    }
    
    query += ' ORDER BY p.payment_date DESC';
    
    const payments = dbCall(db, 'prepare', query).all(...params);
    res.json({ payments });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/payments', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { contractId, paymentDate, amount, paymentType, notes } = req.body;
    
    if (!contractId || !amount || !paymentDate) {
      return res.status(400).json({ error: 'Contract ID, Amount, and Payment Date are required' });
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', `
      INSERT INTO kol_payments (id, contract_id, payment_date, amount, payment_type, notes, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, contractId, paymentDate, amount, paymentType || 'SALARY', notes || null, now, currentUser.id);
    
    dbCall(db, 'prepare', 'UPDATE kol_contracts SET total_paid = total_paid + ?, unpaid_amount = unpaid_amount - ?, updated_at = ? WHERE id = ?').run(amount, amount, now, contractId);
    
    logOperation(db, 'CREATE', 'KOL_PAYMENT', id, currentUser.id, currentUser.name, { contractId, amount });
    
    const payment = dbCall(db, 'prepare', 'SELECT * FROM kol_payments WHERE id = ?').get(id);
    res.json({ payment });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/payments/:id', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    
    const existing = dbCall(db, 'prepare', 'SELECT * FROM kol_payments WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const now = new Date().toISOString();
    dbCall(db, 'prepare', 'UPDATE kol_contracts SET total_paid = total_paid - ?, unpaid_amount = unpaid_amount + ?, updated_at = ? WHERE id = ?').run(existing.amount, existing.amount, now, existing.contract_id);
    
    dbCall(db, 'prepare', 'DELETE FROM kol_payments WHERE id = ?').run(id);
    
    logOperation(db, 'DELETE', 'KOL_PAYMENT', id, currentUser.id, currentUser.name, { deleted: existing });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Batch Operations ====================

router.post('/batch/payments', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { payments } = req.body;
    
    if (!Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ error: 'Payments array is required' });
    }
    
    const now = new Date().toISOString();
    let successCount = 0;
    
    for (const payment of payments) {
      const { contractId, paymentDate, amount, paymentType, notes } = payment;
      
      if (!contractId || !amount || !paymentDate) {
        continue;
      }
      
      const id = uuidv4();
      
      dbCall(db, 'prepare', `
        INSERT INTO kol_payments (id, contract_id, payment_date, amount, payment_type, notes, created_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, contractId, paymentDate, amount, paymentType || 'SALARY', notes || null, now, currentUser.id);
      
      dbCall(db, 'prepare', 'UPDATE kol_contracts SET total_paid = total_paid + ?, unpaid_amount = unpaid_amount - ?, updated_at = ? WHERE id = ?').run(amount, amount, now, contractId);
      
      successCount++;
    }
    
    logOperation(db, 'BATCH_CREATE', 'KOL_PAYMENT', 'BATCH', currentUser.id, currentUser.name, { count: successCount });
    
    res.json({ success: true, count: successCount });
  } catch (error) {
    console.error('Batch create payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;

