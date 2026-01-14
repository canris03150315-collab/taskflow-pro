const fs = require('fs');

console.log('Adding delete route and profile details to KOL routes...');

try {
  const kolPath = '/app/dist/routes/kol.js';
  let content = fs.readFileSync(kolPath, 'utf8');
  
  // Check if delete route already exists
  if (content.includes("router.delete('/profiles/:id'")) {
    console.log('Delete route already exists');
  } else {
    // Add delete route and profile details route before module.exports
    const additionalRoutes = `
router.get('/profiles/:id', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    
    const profile = dbCall(db, 'prepare', 'SELECT * FROM kol_profiles WHERE id = ?').get(id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const contracts = dbCall(db, 'prepare', 'SELECT * FROM kol_contracts WHERE kol_id = ? ORDER BY created_at DESC').all(id);
    const payments = dbCall(db, 'prepare', \`
      SELECT p.* FROM kol_payments p
      JOIN kol_contracts c ON p.contract_id = c.id
      WHERE c.kol_id = ?
      ORDER BY p.payment_date DESC
    \`).all(id);
    
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
    const { facebookId, platformAccount, contactInfo, status, notes } = req.body;
    
    const profile = dbCall(db, 'prepare', 'SELECT * FROM kol_profiles WHERE id = ?').get(id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const now = new Date().toISOString();
    dbCall(db, 'prepare', \`
      UPDATE kol_profiles 
      SET facebook_id = ?, platform_account = ?, contact_info = ?, status = ?, notes = ?, updated_at = ?
      WHERE id = ?
    \`).run(facebookId, platformAccount, contactInfo || null, status, notes || null, now, id);
    
    logOperation(db, 'UPDATE', 'KOL_PROFILE', id, currentUser.id, currentUser.name, { facebookId, platformAccount });
    
    const updated = dbCall(db, 'prepare', 'SELECT * FROM kol_profiles WHERE id = ?').get(id);
    res.json({ profile: updated });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

`;
    
    content = content.replace('module.exports = router;', additionalRoutes + '\nmodule.exports = router;');
    fs.writeFileSync(kolPath, content, 'utf8');
    console.log('SUCCESS: Delete and details routes added');
  }
  
} catch (error) {
  console.error('ERROR:', error);
  process.exit(1);
}
