const fs = require('fs');

console.log('=== Adding Reports Approval Routes (Complete) ===\n');

const filePath = '/app/dist/routes/reports.js';
let content = fs.readFileSync(filePath, 'utf8');

// Step 1: Add authenticateToken import if not exists
if (!content.includes("require('../middleware/auth')") && !content.includes('require("../middleware/auth")')) {
  console.log('Step 1: Adding authenticateToken import...');
  
  const expressRequire = content.indexOf("require('express')");
  if (expressRequire === -1) {
    console.log('ERROR: Could not find express require');
    process.exit(1);
  }
  
  const lineEnd = content.indexOf('\n', expressRequire);
  const before = content.substring(0, lineEnd + 1);
  const after = content.substring(lineEnd + 1);
  content = before + "const { authenticateToken } = require('../middleware/auth');\n" + after;
  console.log('  ✓ Added authenticateToken import');
} else {
  console.log('Step 1: authenticateToken already imported, skipping...');
}

// Step 2: Add approval routes if not exists
if (content.includes('router.get(\'/approval/pending\'')) {
  console.log('Step 2: Approval routes already exist, skipping...');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('\n=== Complete ===');
  process.exit(0);
}

console.log('Step 2: Adding approval routes...');

const exportsPos = content.lastIndexOf('exports.reportRoutes');
if (exportsPos === -1) {
  console.log('ERROR: Could not find exports.reportRoutes');
  process.exit(1);
}

const approvalRoutes = `

// ===== APPROVAL ROUTES =====

router.get('/approval/pending', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    
    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER') {
      return res.json({ authorizations: [] });
    }
    
    const query = \`SELECT ra.*, r.type, r.created_at as report_date,
      u.name as requester_name, u.department as requester_dept
      FROM report_authorizations ra
      JOIN reports r ON ra.report_id = r.id
      JOIN users u ON ra.requester_id = u.id
      WHERE ra.status = 'PENDING'
      ORDER BY ra.requested_at DESC\`;
    
    const authorizations = await db.all(query);
    res.json({ authorizations: authorizations || [] });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/approval/request', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { reportId } = req.body;
    
    if (!reportId) {
      return res.status(400).json({ error: 'Report ID required' });
    }
    
    const authId = \`auth-\${Date.now()}-\${Math.random().toString(36).substring(2, 15)}\`;
    const query = \`INSERT INTO report_authorizations 
      (id, report_id, requester_id, status, requested_at)
      VALUES (?, ?, ?, 'PENDING', datetime('now'))\`;
    
    await db.run(query, [authId, reportId, currentUser.id]);
    res.json({ success: true, authId });
  } catch (error) {
    console.error('Request approval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/approval/approve/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    
    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const query = \`UPDATE report_authorizations
      SET status = 'APPROVED',
          approver_id = ?,
          approved_at = datetime('now'),
          expires_at = datetime('now', '+30 minutes')
      WHERE id = ?\`;
    
    await db.run(query, [currentUser.id, id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/approval/reject/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    
    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const query = \`UPDATE report_authorizations
      SET status = 'REJECTED',
          approver_id = ?,
          approved_at = datetime('now')
      WHERE id = ?\`;
    
    await db.run(query, [currentUser.id, id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Reject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/approval/check', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    
    if (currentUser.role === 'BOSS' || currentUser.role === 'MANAGER') {
      return res.json({ hasAccess: true, role: currentUser.role });
    }
    
    const query = \`SELECT * FROM report_authorizations
      WHERE requester_id = ?
        AND status = 'APPROVED'
        AND expires_at > datetime('now')
      ORDER BY expires_at DESC
      LIMIT 1\`;
    
    const auth = await db.get(query, [currentUser.id]);
    res.json({ hasAccess: !!auth, authorization: auth || null });
  } catch (error) {
    console.error('Check approval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

`;

const before = content.substring(0, exportsPos);
const after = content.substring(exportsPos);
content = before + approvalRoutes + after;

fs.writeFileSync(filePath, content, 'utf8');
console.log('  ✓ Added 5 approval routes');
console.log('\n=== SUCCESS ===');
console.log('Routes added:');
console.log('  - GET /approval/pending');
console.log('  - POST /approval/request');
console.log('  - POST /approval/approve/:id');
console.log('  - POST /approval/reject/:id');
console.log('  - GET /approval/check');
