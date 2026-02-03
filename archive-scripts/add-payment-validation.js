const fs = require('fs');

const filePath = '/app/dist/routes/kol.js';
let content = fs.readFileSync(filePath, 'utf8');

// 找到 POST /payments 路由並添加驗證邏輯
const oldPaymentRoute = `router.post('/payments', authenticateToken, checkKOLPermission, async (req, res) => {
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
    
    dbCall(db, 'prepare', 'UPDATE kol_contracts SET total_paid = total_paid + ?, unpaid_amount = unpaid_amount - ?, updated_at = ? WHERE id = ?').run(amount, amount, now, contractId);`;

const newPaymentRoute = `router.post('/payments', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { contractId, paymentDate, amount, paymentType, notes } = req.body;
    
    if (!contractId || !amount || !paymentDate) {
      return res.status(400).json({ error: 'Contract ID, Amount, and Payment Date are required' });
    }
    
    // 檢查合約並驗證支付金額
    const contract = dbCall(db, 'prepare', 'SELECT unpaid_amount FROM kol_contracts WHERE id = ?').get(contractId);
    if (!contract) {
      return res.status(404).json({ error: '找不到合約' });
    }
    
    const remainingAmount = contract.unpaid_amount;
    if (amount > remainingAmount) {
      return res.status(400).json({ 
        error: \`支付金額超過未付金額。未付金額：$\${remainingAmount}，嘗試支付：$\${amount}\`
      });
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', \`
      INSERT INTO kol_payments (id, contract_id, payment_date, amount, payment_type, notes, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    \`).run(id, contractId, paymentDate, amount, paymentType || 'SALARY', notes || null, now, currentUser.id);
    
    dbCall(db, 'prepare', 'UPDATE kol_contracts SET total_paid = total_paid + ?, unpaid_amount = unpaid_amount - ?, updated_at = ? WHERE id = ?').run(amount, amount, now, contractId);`;

content = content.replace(oldPaymentRoute, newPaymentRoute);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Added payment validation to prevent overpayment');
