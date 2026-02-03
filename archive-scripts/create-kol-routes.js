const fs = require('fs');

const kolRoutesContent = `
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Helper function to log operations
function logOperation(db, operationType, targetType, targetId, userId, userName, changes) {
  try {
    const logId = uuidv4();
    const now = new Date().toISOString();
    db.prepare(\`
      INSERT INTO kol_operation_logs (id, operation_type, target_type, target_id, user_id, user_name, changes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    \`).run(logId, operationType, targetType, targetId, userId, userName, JSON.stringify(changes), now);
  } catch (error) {
    console.error('Failed to log operation:', error);
  }
}

// Permission check: Only BOSS and MANAGER can access KOL management
function checkKOLPermission(req, res, next) {
  const currentUser = req.user;
  if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Access denied. KOL management is restricted to BOSS and MANAGER only.' });
  }
  next();
}

// Apply permission check to all routes
router.use(authenticateToken, checkKOLPermission);

// ==================== KOL Profiles Routes ====================

// GET /api/kol/profiles - Get all KOL profiles with filters
router.get('/profiles', async (req, res) => {
  try {
    const db = req.db;
    const { status, search } = req.query;
    
    let query = 'SELECT * FROM kol_profiles WHERE 1=1';
    const params = [];
    
    if (status && status !== 'ALL') {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (search) {
      query += ' AND (facebook_id LIKE ? OR platform_account LIKE ?)';
      params.push(\`%\${search}%\`, \`%\${search}%\`);
    }
    
    query += ' ORDER BY updated_at DESC';
    
    const profiles = db.prepare(query).all(...params);
    
    // Get contract counts for each profile
    const profilesWithStats = profiles.map(profile => {
      const contractCount = db.prepare('SELECT COUNT(*) as count FROM kol_contracts WHERE kol_id = ?').get(profile.id).count;
      const activeContracts = db.prepare('SELECT COUNT(*) as count FROM kol_contracts WHERE kol_id = ? AND end_date >= date("now")').get(profile.id).count;
      const totalUnpaid = db.prepare('SELECT SUM(unpaid_amount) as total FROM kol_contracts WHERE kol_id = ?').get(profile.id).total || 0;
      
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

// GET /api/kol/profiles/:id - Get single KOL profile with details
router.get('/profiles/:id', async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    
    const profile = db.prepare('SELECT * FROM kol_profiles WHERE id = ?').get(id);
    if (!profile) {
      return res.status(404).json({ error: 'KOL profile not found' });
    }
    
    const contracts = db.prepare('SELECT * FROM kol_contracts WHERE kol_id = ? ORDER BY created_at DESC').all(id);
    const payments = db.prepare(\`
      SELECT p.*, c.kol_id 
      FROM kol_payments p 
      JOIN kol_contracts c ON p.contract_id = c.id 
      WHERE c.kol_id = ? 
      ORDER BY p.payment_date DESC
    \`).all(id);
    
    res.json({ 
      profile,
      contracts,
      payments
    });
  } catch (error) {
    console.error('Get KOL profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/kol/profiles - Create new KOL profile
router.post('/profiles', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { facebookId, platformAccount, contactInfo, status, notes } = req.body;
    
    if (!facebookId || !platformAccount) {
      return res.status(400).json({ error: 'Facebook ID and Platform Account are required' });
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    db.prepare(\`
      INSERT INTO kol_profiles (id, facebook_id, platform_account, contact_info, status, notes, created_at, updated_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    \`).run(id, facebookId, platformAccount, contactInfo || null, status || 'ACTIVE', notes || null, now, now, currentUser.id);
    
    logOperation(db, 'CREATE', 'KOL_PROFILE', id, currentUser.id, currentUser.name, { facebookId, platformAccount });
    
    const profile = db.prepare('SELECT * FROM kol_profiles WHERE id = ?').get(id);
    res.json({ profile });
  } catch (error) {
    console.error('Create KOL profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/kol/profiles/:id - Update KOL profile
router.put('/profiles/:id', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const { facebookId, platformAccount, contactInfo, status, notes } = req.body;
    
    const existing = db.prepare('SELECT * FROM kol_profiles WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'KOL profile not found' });
    }
    
    const now = new Date().toISOString();
    
    db.prepare(\`
      UPDATE kol_profiles 
      SET facebook_id = ?, platform_account = ?, contact_info = ?, status = ?, notes = ?, updated_at = ?
      WHERE id = ?
    \`).run(facebookId, platformAccount, contactInfo || null, status, notes || null, now, id);
    
    logOperation(db, 'UPDATE', 'KOL_PROFILE', id, currentUser.id, currentUser.name, { 
      old: existing, 
      new: { facebookId, platformAccount, contactInfo, status, notes } 
    });
    
    const profile = db.prepare('SELECT * FROM kol_profiles WHERE id = ?').get(id);
    res.json({ profile });
  } catch (error) {
    console.error('Update KOL profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/kol/profiles/:id - Delete KOL profile (cascade delete contracts and payments)
router.delete('/profiles/:id', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    
    const existing = db.prepare('SELECT * FROM kol_profiles WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'KOL profile not found' });
    }
    
    db.prepare('DELETE FROM kol_profiles WHERE id = ?').run(id);
    
    logOperation(db, 'DELETE', 'KOL_PROFILE', id, currentUser.id, currentUser.name, { deleted: existing });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete KOL profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== KOL Contracts Routes ====================

// GET /api/kol/contracts - Get all contracts with filters
router.get('/contracts', async (req, res) => {
  try {
    const db = req.db;
    const { kolId, startDate, endDate, contractType } = req.query;
    
    let query = \`
      SELECT c.*, p.facebook_id, p.platform_account, p.status as kol_status
      FROM kol_contracts c
      JOIN kol_profiles p ON c.kol_id = p.id
      WHERE 1=1
    \`;
    const params = [];
    
    if (kolId) {
      query += ' AND c.kol_id = ?';
      params.push(kolId);
    }
    
    if (startDate) {
      query += ' AND c.start_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND c.end_date <= ?';
      params.push(endDate);
    }
    
    if (contractType && contractType !== 'ALL') {
      query += ' AND c.contract_type = ?';
      params.push(contractType);
    }
    
    query += ' ORDER BY c.created_at DESC';
    
    const contracts = db.prepare(query).all(...params);
    res.json({ contracts });
  } catch (error) {
    console.error('Get contracts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/kol/contracts - Create new contract
router.post('/contracts', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { 
      kolId, startDate, endDate, salaryAmount, depositAmount, 
      unpaidAmount, clearedAmount, totalPaid, contractType, notes 
    } = req.body;
    
    if (!kolId || salaryAmount === undefined) {
      return res.status(400).json({ error: 'KOL ID and Salary Amount are required' });
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    db.prepare(\`
      INSERT INTO kol_contracts (
        id, kol_id, start_date, end_date, salary_amount, deposit_amount, 
        unpaid_amount, cleared_amount, total_paid, contract_type, notes, 
        created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    \`).run(
      id, kolId, startDate || null, endDate || null, salaryAmount, depositAmount || 0,
      unpaidAmount || 0, clearedAmount || 0, totalPaid || 0, contractType || 'NORMAL', 
      notes || null, now, now, currentUser.id
    );
    
    logOperation(db, 'CREATE', 'KOL_CONTRACT', id, currentUser.id, currentUser.name, { kolId, salaryAmount });
    
    const contract = db.prepare('SELECT * FROM kol_contracts WHERE id = ?').get(id);
    res.json({ contract });
  } catch (error) {
    console.error('Create contract error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/kol/contracts/:id - Update contract
router.put('/contracts/:id', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const { 
      startDate, endDate, salaryAmount, depositAmount, 
      unpaidAmount, clearedAmount, totalPaid, contractType, notes 
    } = req.body;
    
    const existing = db.prepare('SELECT * FROM kol_contracts WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    const now = new Date().toISOString();
    
    db.prepare(\`
      UPDATE kol_contracts 
      SET start_date = ?, end_date = ?, salary_amount = ?, deposit_amount = ?, 
          unpaid_amount = ?, cleared_amount = ?, total_paid = ?, contract_type = ?, 
          notes = ?, updated_at = ?
      WHERE id = ?
    \`).run(
      startDate || null, endDate || null, salaryAmount, depositAmount,
      unpaidAmount, clearedAmount, totalPaid, contractType, notes || null, now, id
    );
    
    logOperation(db, 'UPDATE', 'KOL_CONTRACT', id, currentUser.id, currentUser.name, { old: existing, new: req.body });
    
    const contract = db.prepare('SELECT * FROM kol_contracts WHERE id = ?').get(id);
    res.json({ contract });
  } catch (error) {
    console.error('Update contract error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/kol/contracts/:id - Delete contract
router.delete('/contracts/:id', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    
    const existing = db.prepare('SELECT * FROM kol_contracts WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    db.prepare('DELETE FROM kol_contracts WHERE id = ?').run(id);
    
    logOperation(db, 'DELETE', 'KOL_CONTRACT', id, currentUser.id, currentUser.name, { deleted: existing });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete contract error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== KOL Payments Routes ====================

// GET /api/kol/payments - Get all payments
router.get('/payments', async (req, res) => {
  try {
    const db = req.db;
    const { contractId, startDate, endDate } = req.query;
    
    let query = \`
      SELECT p.*, c.kol_id, k.facebook_id, k.platform_account
      FROM kol_payments p
      JOIN kol_contracts c ON p.contract_id = c.id
      JOIN kol_profiles k ON c.kol_id = k.id
      WHERE 1=1
    \`;
    const params = [];
    
    if (contractId) {
      query += ' AND p.contract_id = ?';
      params.push(contractId);
    }
    
    if (startDate) {
      query += ' AND p.payment_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND p.payment_date <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY p.payment_date DESC';
    
    const payments = db.prepare(query).all(...params);
    res.json({ payments });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/kol/payments - Create new payment
router.post('/payments', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { contractId, paymentDate, amount, paymentType, notes, attachment } = req.body;
    
    if (!contractId || !amount || !paymentDate) {
      return res.status(400).json({ error: 'Contract ID, Amount, and Payment Date are required' });
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    db.prepare(\`
      INSERT INTO kol_payments (id, contract_id, payment_date, amount, payment_type, notes, attachment, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    \`).run(id, contractId, paymentDate, amount, paymentType || 'SALARY', notes || null, attachment || null, now, currentUser.id);
    
    // Update contract total_paid
    db.prepare('UPDATE kol_contracts SET total_paid = total_paid + ?, updated_at = ? WHERE id = ?').run(amount, now, contractId);
    
    logOperation(db, 'CREATE', 'KOL_PAYMENT', id, currentUser.id, currentUser.name, { contractId, amount });
    
    const payment = db.prepare('SELECT * FROM kol_payments WHERE id = ?').get(id);
    res.json({ payment });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/kol/payments/:id - Delete payment
router.delete('/payments/:id', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    
    const existing = db.prepare('SELECT * FROM kol_payments WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    // Update contract total_paid
    const now = new Date().toISOString();
    db.prepare('UPDATE kol_contracts SET total_paid = total_paid - ?, updated_at = ? WHERE id = ?').run(existing.amount, now, existing.contract_id);
    
    db.prepare('DELETE FROM kol_payments WHERE id = ?').run(id);
    
    logOperation(db, 'DELETE', 'KOL_PAYMENT', id, currentUser.id, currentUser.name, { deleted: existing });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Statistics Routes ====================

// GET /api/kol/stats - Get KOL statistics
router.get('/stats', async (req, res) => {
  try {
    const db = req.db;
    const { startDate, endDate } = req.query;
    
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const start = startDate || firstDayOfMonth;
    const end = endDate || lastDayOfMonth;
    
    // Total KOLs by status
    const totalKOLs = db.prepare('SELECT COUNT(*) as count FROM kol_profiles').get().count;
    const activeKOLs = db.prepare('SELECT COUNT(*) as count FROM kol_profiles WHERE status = "ACTIVE"').get().count;
    
    // Active contracts (not expired)
    const activeContracts = db.prepare('SELECT COUNT(*) as count FROM kol_contracts WHERE end_date >= date("now")').get().count;
    
    // Total unpaid amount
    const totalUnpaid = db.prepare('SELECT SUM(unpaid_amount) as total FROM kol_contracts').get().total || 0;
    
    // Monthly payments
    const monthlyPayments = db.prepare(\`
      SELECT SUM(amount) as total 
      FROM kol_payments 
      WHERE payment_date >= ? AND payment_date <= ?
    \`).get(start, end).total || 0;
    
    // Monthly contracts
    const monthlyContracts = db.prepare(\`
      SELECT COUNT(*) as count 
      FROM kol_contracts 
      WHERE created_at >= ? AND created_at <= ?
    \`).get(start, end).count;
    
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

// ==================== Batch Operations ====================

// POST /api/kol/batch/payments - Batch create payments
router.post('/batch/payments', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { payments } = req.body;
    
    if (!Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ error: 'Payments array is required' });
    }
    
    const now = new Date().toISOString();
    const createdPayments = [];
    
    for (const payment of payments) {
      const { contractId, paymentDate, amount, paymentType, notes } = payment;
      
      if (!contractId || !amount || !paymentDate) {
        continue;
      }
      
      const id = uuidv4();
      
      db.prepare(\`
        INSERT INTO kol_payments (id, contract_id, payment_date, amount, payment_type, notes, created_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      \`).run(id, contractId, paymentDate, amount, paymentType || 'SALARY', notes || null, now, currentUser.id);
      
      db.prepare('UPDATE kol_contracts SET total_paid = total_paid + ?, updated_at = ? WHERE id = ?').run(amount, now, contractId);
      
      createdPayments.push(id);
    }
    
    logOperation(db, 'BATCH_CREATE', 'KOL_PAYMENT', 'BATCH', currentUser.id, currentUser.name, { count: createdPayments.length });
    
    res.json({ success: true, count: createdPayments.length });
  } catch (error) {
    console.error('Batch create payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/kol/batch/status - Batch update KOL status
router.put('/batch/status', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { kolIds, status } = req.body;
    
    if (!Array.isArray(kolIds) || kolIds.length === 0 || !status) {
      return res.status(400).json({ error: 'KOL IDs array and status are required' });
    }
    
    const now = new Date().toISOString();
    const placeholders = kolIds.map(() => '?').join(',');
    
    db.prepare(\`UPDATE kol_profiles SET status = ?, updated_at = ? WHERE id IN (\${placeholders})\`).run(status, now, ...kolIds);
    
    logOperation(db, 'BATCH_UPDATE', 'KOL_PROFILE', 'BATCH', currentUser.id, currentUser.name, { kolIds, status });
    
    res.json({ success: true, count: kolIds.length });
  } catch (error) {
    console.error('Batch update status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Operation Logs ====================

// GET /api/kol/logs - Get operation logs
router.get('/logs', async (req, res) => {
  try {
    const db = req.db;
    const { targetType, targetId, limit = 100 } = req.query;
    
    let query = 'SELECT * FROM kol_operation_logs WHERE 1=1';
    const params = [];
    
    if (targetType) {
      query += ' AND target_type = ?';
      params.push(targetType);
    }
    
    if (targetId) {
      query += ' AND target_id = ?';
      params.push(targetId);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const logs = db.prepare(query).all(...params);
    res.json({ logs });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
`;

console.log('Creating KOL routes file...');

try {
  fs.writeFileSync('/app/dist/routes/kol.js', kolRoutesContent, 'utf8');
  console.log('✅ KOL routes file created successfully at /app/dist/routes/kol.js');
} catch (error) {
  console.error('❌ Error creating KOL routes file:', error);
  process.exit(1);
}
