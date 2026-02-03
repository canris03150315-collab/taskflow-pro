const fs = require('fs');

console.log('Adding complete KOL management routes...');

try {
  const kolPath = '/app/dist/routes/kol.js';
  let content = fs.readFileSync(kolPath, 'utf8');
  
  // Check if contract routes already exist
  if (content.includes("router.get('/contracts'")) {
    console.log('Contract routes already exist');
    process.exit(0);
  }
  
  const completeRoutes = `

// ==================== Contracts Management ====================

router.get('/contracts', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const { kolId } = req.query;
    
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
    
    dbCall(db, 'prepare', \`
      INSERT INTO kol_contracts (
        id, kol_id, start_date, end_date, salary_amount, deposit_amount, 
        unpaid_amount, cleared_amount, total_paid, contract_type, notes, 
        created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    \`).run(
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
    
    dbCall(db, 'prepare', \`
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
    
    dbCall(db, 'prepare', \`
      INSERT INTO kol_payments (id, contract_id, payment_date, amount, payment_type, notes, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    \`).run(id, contractId, paymentDate, amount, paymentType || 'SALARY', notes || null, now, currentUser.id);
    
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
      
      dbCall(db, 'prepare', \`
        INSERT INTO kol_payments (id, contract_id, payment_date, amount, payment_type, notes, created_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      \`).run(id, contractId, paymentDate, amount, paymentType || 'SALARY', notes || null, now, currentUser.id);
      
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

`;
  
  // Insert before module.exports
  content = content.replace('module.exports = router;', completeRoutes + '\nmodule.exports = router;');
  
  fs.writeFileSync(kolPath, content, 'utf8');
  console.log('SUCCESS: Complete KOL routes added');
  
} catch (error) {
  console.error('ERROR:', error);
  process.exit(1);
}
