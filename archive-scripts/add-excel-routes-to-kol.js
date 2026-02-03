const fs = require('fs');

console.log('Adding Excel import/export routes to KOL...');

try {
  const kolPath = '/app/dist/routes/kol.js';
  let content = fs.readFileSync(kolPath, 'utf8');
  
  // Check if Excel routes already exist
  if (content.includes('/import-excel')) {
    console.log('Excel routes already exist');
    process.exit(0);
  }
  
  // Find the position before module.exports
  const excelRoutes = `
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
        if (!row.facebookId || !row.platformAccount) {
          results.failed++;
          results.errors.push({ row: i + 1, error: 'Missing required fields' });
          continue;
        }
        
        const now = new Date().toISOString();
        const existing = dbCall(db, 'prepare', 'SELECT id FROM kol_profiles WHERE facebook_id = ? AND platform_account = ?').get(row.facebookId, row.platformAccount);
        
        if (existing) {
          dbCall(db, 'prepare', \`UPDATE kol_profiles SET contact_info = ?, status = ?, notes = ?, updated_at = ? WHERE id = ?\`).run(
            row.contactInfo || null, row.status || 'ACTIVE', row.notes || null, now, existing.id
          );
          
          if (row.salaryAmount) {
            const contractId = uuidv4();
            dbCall(db, 'prepare', \`
              INSERT INTO kol_contracts (id, kol_id, start_date, end_date, salary_amount, deposit_amount, unpaid_amount, cleared_amount, total_paid, contract_type, notes, created_at, updated_at, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            \`).run(contractId, existing.id, row.startDate || null, row.endDate || null, row.salaryAmount, row.depositAmount || 0, row.unpaidAmount || 0, row.clearedAmount || 0, row.totalPaid || 0, row.contractType || 'NORMAL', row.contractNotes || null, now, now, currentUser.id);
          }
          results.success++;
        } else {
          const kolId = uuidv4();
          dbCall(db, 'prepare', \`INSERT INTO kol_profiles (id, facebook_id, platform_account, contact_info, status, notes, created_at, updated_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)\`).run(
            kolId, row.facebookId, row.platformAccount, row.contactInfo || null, row.status || 'ACTIVE', row.notes || null, now, now, currentUser.id
          );
          
          if (row.salaryAmount) {
            const contractId = uuidv4();
            dbCall(db, 'prepare', \`
              INSERT INTO kol_contracts (id, kol_id, start_date, end_date, salary_amount, deposit_amount, unpaid_amount, cleared_amount, total_paid, contract_type, notes, created_at, updated_at, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            \`).run(contractId, kolId, row.startDate || null, row.endDate || null, row.salaryAmount, row.depositAmount || 0, row.unpaidAmount || 0, row.clearedAmount || 0, row.totalPaid || 0, row.contractType || 'NORMAL', row.contractNotes || null, now, now, currentUser.id);
          }
          results.success++;
        }
        
        logOperation(db, 'IMPORT', 'KOL_PROFILE', 'EXCEL_IMPORT', currentUser.id, currentUser.name, { row: i + 1 });
      } catch (error) {
        results.failed++;
        results.errors.push({ row: i + 1, error: error.message });
      }
    }
    
    res.json({ success: true, results, message: \`Imported \${results.success} records, \${results.failed} failed\` });
  } catch (error) {
    console.error('Excel import error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/export-excel', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const profiles = dbCall(db, 'prepare', \`
      SELECT p.facebook_id, p.platform_account, p.contact_info, p.status, p.notes,
             c.start_date, c.end_date, c.salary_amount, c.deposit_amount, c.unpaid_amount,
             c.cleared_amount, c.total_paid, c.contract_type, c.notes as contract_notes
      FROM kol_profiles p
      LEFT JOIN kol_contracts c ON p.id = c.kol_id
      ORDER BY p.updated_at DESC
    \`).all();
    
    res.json({ profiles });
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

`;
  
  // Insert before module.exports
  content = content.replace('module.exports = router;', excelRoutes + '\nmodule.exports = router;');
  
  fs.writeFileSync(kolPath, content, 'utf8');
  console.log('SUCCESS: Excel routes added');
  
} catch (error) {
  console.error('ERROR:', error);
  process.exit(1);
}
