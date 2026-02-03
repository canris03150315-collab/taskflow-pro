const fs = require('fs');

console.log('Creating KOL routes with dbCall adapter...');

const kolRoutesContent = `const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

// Database call helper function
function dbCall(db, method, ...args) {
  if (typeof db[method] === 'function') {
    return db[method](...args);
  }
  if (db.db && typeof db.db[method] === 'function') {
    return db.db[method](...args);
  }
  throw new Error(\`Method \${method} not found on database object\`);
}

// Helper: Log operations
function logOperation(db, operationType, targetType, targetId, userId, userName, changes) {
  try {
    const logId = uuidv4();
    const now = new Date().toISOString();
    dbCall(db, 'prepare', \`
      INSERT INTO kol_operation_logs (id, operation_type, target_type, target_id, user_id, user_name, changes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    \`).run(logId, operationType, targetType, targetId, userId, userName, JSON.stringify(changes), now);
  } catch (error) {
    console.error('Failed to log operation:', error);
  }
}

// Permission check middleware
function checkKOLPermission(req, res, next) {
  const currentUser = req.user;
  if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Access denied. KOL management is restricted to BOSS and MANAGER only.' });
  }
  next();
}

// GET /api/kol/profiles
router.get('/profiles', authenticateToken, checkKOLPermission, async (req, res) => {
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
    
    const profiles = dbCall(db, 'prepare', query).all(...params);
    
    const profilesWithStats = profiles.map(profile => {
      const contractCount = dbCall(db, 'prepare', 'SELECT COUNT(*) as count FROM kol_contracts WHERE kol_id = ?').get(profile.id).count;
      const activeContracts = dbCall(db, 'prepare', 'SELECT COUNT(*) as count FROM kol_contracts WHERE kol_id = ? AND end_date >= date("now")').get(profile.id).count;
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

// GET /api/kol/stats
router.get('/stats', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const { startDate, endDate } = req.query;
    
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const start = startDate || firstDayOfMonth;
    const end = endDate || lastDayOfMonth;
    
    const totalKOLs = dbCall(db, 'prepare', 'SELECT COUNT(*) as count FROM kol_profiles').get().count;
    const activeKOLs = dbCall(db, 'prepare', 'SELECT COUNT(*) as count FROM kol_profiles WHERE status = "ACTIVE"').get().count;
    const activeContracts = dbCall(db, 'prepare', 'SELECT COUNT(*) as count FROM kol_contracts WHERE end_date >= date("now")').get().count;
    const totalUnpaid = dbCall(db, 'prepare', 'SELECT SUM(unpaid_amount) as total FROM kol_contracts').get().total || 0;
    const monthlyPayments = dbCall(db, 'prepare', \`
      SELECT SUM(amount) as total 
      FROM kol_payments 
      WHERE payment_date >= ? AND payment_date <= ?
    \`).get(start, end).total || 0;
    const monthlyContracts = dbCall(db, 'prepare', \`
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

// POST /api/kol/profiles
router.post('/profiles', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { facebookId, platformAccount, contactInfo, status, notes } = req.body;
    
    if (!facebookId || !platformAccount) {
      return res.status(400).json({ error: 'Facebook ID and Platform Account are required' });
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', \`
      INSERT INTO kol_profiles (id, facebook_id, platform_account, contact_info, status, notes, created_at, updated_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    \`).run(id, facebookId, platformAccount, contactInfo || null, status || 'ACTIVE', notes || null, now, now, currentUser.id);
    
    logOperation(db, 'CREATE', 'KOL_PROFILE', id, currentUser.id, currentUser.name, { facebookId, platformAccount });
    
    const profile = dbCall(db, 'prepare', 'SELECT * FROM kol_profiles WHERE id = ?').get(id);
    res.json({ profile });
  } catch (error) {
    console.error('Create KOL profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
`;

try {
  fs.writeFileSync('/app/dist/routes/kol.js', kolRoutesContent, 'utf8');
  console.log('SUCCESS: KOL routes file created at /app/dist/routes/kol.js');
} catch (error) {
  console.error('ERROR: Failed to create KOL routes file:', error);
  process.exit(1);
}
