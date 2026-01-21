const fs = require('fs');

const filePath = '/app/dist/routes/kol.js';
let content = fs.readFileSync(filePath, 'utf8');

// 找到並替換 POST /payments 路由
const paymentRouteRegex = /router\.post\(['"]\/payments['"],\s*authenticateToken,\s*checkKOLPermission,\s*async\s*\(req,\s*res\)\s*=>\s*\{[\s\S]*?const\s+id\s*=\s*uuidv4\(\);/;

const newPaymentLogic = `router.post('/payments', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { contractId, paymentDate, amount, paymentType, notes } = req.body;
    
    if (!contractId || !amount || !paymentDate) {
      return res.status(400).json({ error: 'Contract ID, Amount, and Payment Date are required' });
    }
    
    // Check contract and validate payment amount
    const contract = dbCall(db, 'prepare', 'SELECT unpaid_amount FROM kol_contracts WHERE id = ?').get(contractId);
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    const remainingAmount = contract.unpaid_amount;
    if (amount > remainingAmount) {
      return res.status(400).json({ 
        error: \`Payment amount exceeds unpaid amount. Unpaid: $\${remainingAmount}, Attempting: $\${amount}\`
      });
    }
    
    const id = uuidv4();`;

content = content.replace(paymentRouteRegex, newPaymentLogic);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Added payment validation');
