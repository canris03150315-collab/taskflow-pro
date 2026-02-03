const fs = require('fs');

console.log('=== Adding update-cell API to platform-revenue route ===\n');

const routeFile = '/app/dist/routes/platform-revenue.js';

try {
  let content = fs.readFileSync(routeFile, 'utf8');
  
  // Check if update-cell route already exists
  if (content.includes("router.put('/update-cell'")) {
    console.log('update-cell API already exists, skipping...');
    process.exit(0);
  }
  
  // Find the position to insert the new route (before module.exports)
  const exportPos = content.lastIndexOf('module.exports = router;');
  
  if (exportPos === -1) {
    throw new Error('Cannot find module.exports in route file');
  }
  
  // New route code (Pure ASCII)
  const newRoute = `
// Update single cell in platform revenue
router.put('/update-cell', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { platform, date, field, value } = req.body;
    const currentUser = req.user;
    
    // Check permission: only SUPERVISOR, MANAGER, or BOSS can edit
    const allowedRoles = ['SUPERVISOR', 'MANAGER', 'BOSS'];
    if (!allowedRoles.includes(currentUser.role)) {
      return res.status(403).json({ error: '\\u6b0a\\u9650\\u4e0d\\u8db3\\uff0c\\u53ea\\u6709\\u4e3b\\u7ba1\\u4ee5\\u4e0a\\u8077\\u7d1a\\u53ef\\u4ee5\\u7de8\\u8f2f' });
    }
    
    // Validate field name
    const allowedFields = [
      'lottery_wage', 'lottery_rebate', 'game_ag', 'game_chess',
      'game_rebate', 'game_private', 'lottery_dividend_receive',
      'lottery_dividend_send', 'external_dividend_receive',
      'external_dividend_send', 'private_return', 'deposit_amount',
      'withdrawal_amount', 'loan_amount', 'profit', 'balance'
    ];
    
    if (!allowedFields.includes(field)) {
      return res.status(400).json({ error: '\\u7121\\u6548\\u7684\\u6b04\\u4f4d\\u540d\\u7a31' });
    }
    
    const now = new Date().toISOString();
    
    // Check if record exists
    const existing = dbCall(db, 'prepare',
      'SELECT id FROM platform_transactions WHERE platform_name = ? AND date = ?'
    ).get(platform, date);
    
    if (existing) {
      // Update existing record
      const updateSql = \`UPDATE platform_transactions SET \${field} = ?, last_modified_by = ?, last_modified_by_name = ?, last_modified_at = ?, updated_at = ? WHERE platform_name = ? AND date = ?\`;
      dbCall(db, 'prepare', updateSql).run(
        value,
        currentUser.id,
        currentUser.username,
        now,
        now,
        platform,
        date
      );
    } else {
      // Create new record with this field
      const id = \`platform-tx-\${Date.now()}-\${require('crypto').randomBytes(4).toString('hex')}\`;
      const insertSql = \`INSERT INTO platform_transactions (id, platform_name, date, \${field}, uploaded_by, uploaded_by_name, uploaded_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)\`;
      dbCall(db, 'prepare', insertSql).run(
        id,
        platform,
        date,
        value,
        currentUser.id,
        currentUser.username,
        now,
        now,
        now
      );
    }
    
    res.json({ success: true, message: '\\u66f4\\u65b0\\u6210\\u529f' });
    
  } catch (error) {
    console.error('Update cell error:', error);
    res.status(500).json({ error: '\\u66f4\\u65b0\\u5931\\u6557' });
  }
});

`;
  
  // Insert the new route before module.exports
  const newContent = content.slice(0, exportPos) + newRoute + content.slice(exportPos);
  
  // Write back to file
  fs.writeFileSync(routeFile, newContent, 'utf8');
  
  console.log('OK - Added update-cell API route');
  console.log('Route location: PUT /api/platform-revenue/update-cell');
  console.log('Permission: SUPERVISOR, MANAGER, BOSS only');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}

console.log('\n=== Complete ===');
