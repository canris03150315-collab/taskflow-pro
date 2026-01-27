const fs = require('fs');

console.log('=== Adding Payment Routes to kol.js ===\n');

const filePath = '/app/dist/routes/kol.js';
let content = fs.readFileSync(filePath, 'utf8');

// 在 module.exports 之前添加支付相關路由
const paymentRoutes = `
// ==================== Payment Routes ====================

// POST /payments - Create payment record
router.post('/payments', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { kolId, amount, paymentDate, notes } = req.body;
    
    if (!kolId || !amount || !paymentDate) {
      return res.status(400).json({ error: 'Required fields missing' });
    }
    
    const kol = dbCall(db, 'prepare', 'SELECT * FROM kol_profiles WHERE id = ?').get(kolId);
    if (!kol) {
      return res.status(404).json({ error: 'KOL not found' });
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', \`
      INSERT INTO kol_weekly_payments (id, kol_id, amount, payment_date, notes, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    \`).run(id, kolId, amount, paymentDate, notes || null, now, currentUser.id);
    
    logOperation(db, 'CREATE', 'KOL_PAYMENT', id, currentUser.id, currentUser.name, { kolId, amount, paymentDate });
    
    const payment = dbCall(db, 'prepare', 'SELECT * FROM kol_weekly_payments WHERE id = ?').get(id);
    res.json({ payment });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
      return res.status(404).json({ error: 'KOL not found' });
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /payment-stats - Get payment statistics
router.get('/payment-stats', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const { startDate, endDate } = req.query;
    
    let query = 'SELECT SUM(amount) as total FROM kol_weekly_payments WHERE 1=1';
    const params = [];
    
    if (startDate) {
      query += ' AND payment_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND payment_date <= ?';
      params.push(endDate);
    }
    
    const result = dbCall(db, 'prepare', query).get(...params);
    
    res.json({ total: result.total || 0 });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /payments/:id - Update payment record
router.put('/payments/:id', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const { amount, paymentDate, notes } = req.body;
    
    const payment = dbCall(db, 'prepare', 'SELECT * FROM kol_weekly_payments WHERE id = ?').get(id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found' });
    }
    
    const isBossOrManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';
    const isCreator = payment.created_by === currentUser.id;
    
    if (!isBossOrManager && !isCreator) {
      return res.status(403).json({ error: 'Permission denied. Only creator or manager can edit.' });
    }
    
    const now = new Date().toISOString();
    dbCall(db, 'prepare', \`
      UPDATE kol_weekly_payments 
      SET amount = ?, payment_date = ?, notes = ?, updated_at = ?, updated_by = ?
      WHERE id = ?
    \`).run(amount, paymentDate, notes || null, now, currentUser.id, id);
    
    logOperation(db, 'UPDATE', 'KOL_PAYMENT', id, currentUser.id, currentUser.name, { amount, paymentDate });
    
    const updated = dbCall(db, 'prepare', 'SELECT * FROM kol_weekly_payments WHERE id = ?').get(id);
    res.json({ payment: updated });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
      return res.status(404).json({ error: 'Payment record not found' });
    }
    
    const isBossOrManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';
    const isCreator = payment.created_by === currentUser.id;
    
    if (!isBossOrManager && !isCreator) {
      return res.status(403).json({ error: 'Permission denied. Only creator or manager can delete.' });
    }
    
    dbCall(db, 'prepare', 'DELETE FROM kol_weekly_payments WHERE id = ?').run(id);
    
    logOperation(db, 'DELETE', 'KOL_PAYMENT', id, currentUser.id, currentUser.name, { amount: payment.amount });
    
    res.json({ success: true, message: 'Payment record deleted successfully' });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

`;

// 在 module.exports 之前插入支付路由
content = content.replace('module.exports = router;', paymentRoutes + '\nmodule.exports = router;');

fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Payment routes added successfully!');
console.log('\nAdded routes:');
console.log('- POST /payments - Create payment record');
console.log('- GET /profiles/:kolId/payments - Get payment records');
console.log('- GET /payment-stats - Get payment statistics');
console.log('- PUT /payments/:id - Update payment record');
console.log('- DELETE /payments/:id - Delete payment record');
