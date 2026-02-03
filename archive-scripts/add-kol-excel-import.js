const fs = require('fs');

console.log('Adding Excel import functionality to KOL routes...');

try {
  const kolRoutesPath = '/app/dist/routes/kol.js';
  let content = fs.readFileSync(kolRoutesPath, 'utf8');
  
  // Check if Excel import route already exists
  if (content.includes('/import-excel')) {
    console.log('⚠️  Excel import route already exists');
    process.exit(0);
  }
  
  // Find the position to insert (before module.exports)
  const moduleExportsPattern = /module\.exports = router;/;
  
  if (!moduleExportsPattern.test(content)) {
    console.error('❌ Could not find module.exports');
    process.exit(1);
  }
  
  // Excel import route code
  const excelImportRoute = `
// ==================== Excel Import/Export ====================

// POST /api/kol/import-excel - Import KOL data from Excel
router.post('/import-excel', checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { data } = req.body;
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'No data provided' });
    }
    
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Validate required fields
        if (!row.facebookId || !row.platformAccount) {
          results.failed++;
          results.errors.push({ row: i + 1, error: 'Missing required fields (facebookId or platformAccount)' });
          continue;
        }
        
        const now = new Date().toISOString();
        
        // Check if KOL already exists
        const existing = db.prepare('SELECT id FROM kol_profiles WHERE facebook_id = ? AND platform_account = ?')
          .get(row.facebookId, row.platformAccount);
        
        if (existing) {
          // Update existing KOL
          db.prepare(\`
            UPDATE kol_profiles 
            SET contact_info = ?, status = ?, notes = ?, updated_at = ?
            WHERE id = ?
          \`).run(
            row.contactInfo || null,
            row.status || 'ACTIVE',
            row.notes || null,
            now,
            existing.id
          );
          
          // If contract data exists, create contract
          if (row.salaryAmount) {
            const contractId = require('uuid').v4();
            db.prepare(\`
              INSERT INTO kol_contracts (
                id, kol_id, start_date, end_date, salary_amount, deposit_amount,
                unpaid_amount, cleared_amount, total_paid, contract_type, notes,
                created_at, updated_at, created_by
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            \`).run(
              contractId, existing.id, row.startDate || null, row.endDate || null,
              row.salaryAmount, row.depositAmount || 0, row.unpaidAmount || 0,
              row.clearedAmount || 0, row.totalPaid || 0, row.contractType || 'NORMAL',
              row.contractNotes || null, now, now, currentUser.id
            );
          }
          
          results.success++;
        } else {
          // Create new KOL
          const kolId = require('uuid').v4();
          db.prepare(\`
            INSERT INTO kol_profiles (id, facebook_id, platform_account, contact_info, status, notes, created_at, updated_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          \`).run(
            kolId, row.facebookId, row.platformAccount, row.contactInfo || null,
            row.status || 'ACTIVE', row.notes || null, now, now, currentUser.id
          );
          
          // If contract data exists, create contract
          if (row.salaryAmount) {
            const contractId = require('uuid').v4();
            db.prepare(\`
              INSERT INTO kol_contracts (
                id, kol_id, start_date, end_date, salary_amount, deposit_amount,
                unpaid_amount, cleared_amount, total_paid, contract_type, notes,
                created_at, updated_at, created_by
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            \`).run(
              contractId, kolId, row.startDate || null, row.endDate || null,
              row.salaryAmount, row.depositAmount || 0, row.unpaidAmount || 0,
              row.clearedAmount || 0, row.totalPaid || 0, row.contractType || 'NORMAL',
              row.contractNotes || null, now, now, currentUser.id
            );
          }
          
          results.success++;
        }
        
        logOperation(db, 'IMPORT', 'KOL_PROFILE', 'EXCEL_IMPORT', currentUser.id, currentUser.name, { row: i + 1 });
        
      } catch (error) {
        results.failed++;
        results.errors.push({ row: i + 1, error: error.message });
      }
    }
    
    res.json({ 
      success: true, 
      results,
      message: \`Successfully imported \${results.success} records, \${results.failed} failed\`
    });
    
  } catch (error) {
    console.error('Excel import error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/kol/export-excel - Export KOL data for Excel
router.get('/export-excel', checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    
    const profiles = db.prepare(\`
      SELECT 
        p.facebook_id,
        p.platform_account,
        p.contact_info,
        p.status,
        p.notes,
        c.start_date,
        c.end_date,
        c.salary_amount,
        c.deposit_amount,
        c.unpaid_amount,
        c.cleared_amount,
        c.total_paid,
        c.contract_type,
        c.notes as contract_notes
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
  content = content.replace(moduleExportsPattern, excelImportRoute + '\nmodule.exports = router;');
  
  fs.writeFileSync(kolRoutesPath, content, 'utf8');
  console.log('✅ Excel import/export routes added successfully');
  
} catch (error) {
  console.error('❌ Error adding Excel routes:', error);
  process.exit(1);
}
