const fs = require('fs');

console.log('=== Adding Reports Approval Routes ===\n');

const filePath = '/app/dist/routes/reports.js';
let content = fs.readFileSync(filePath, 'utf8');

// Check if approval routes already exist
if (content.includes('router.get(\'/approval/pending\'')) {
  console.log('Approval routes already exist, skipping...');
  process.exit(0);
}

// Find the position to insert (before exports)
const exportsPos = content.lastIndexOf('exports.reportRoutes');
if (exportsPos === -1) {
  console.log('ERROR: Could not find exports.reportRoutes');
  process.exit(1);
}

// Approval routes to add (Pure ASCII)
const approvalRoutes = `

// ============================================================================
// APPROVAL ROUTES
// ============================================================================

// GET /approval/pending - Get pending approval requests
router.get('/approval/pending', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    
    // Only BOSS and MANAGER can approve
    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER') {
      return res.json({ authorizations: [] });
    }
    
    const query = \`
      SELECT ra.*, r.type, r.created_at as report_date,
             u.name as requester_name, u.department as requester_dept
      FROM report_authorizations ra
      JOIN reports r ON ra.report_id = r.id
      JOIN users u ON ra.requester_id = u.id
      WHERE ra.status = 'PENDING'
      ORDER BY ra.requested_at DESC
    \`;
    
    const authorizations = await db.all(query);
    res.json({ authorizations: authorizations || [] });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /approval/request - Request approval
router.post('/approval/request', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { reportId } = req.body;
    
    if (!reportId) {
      return res.status(400).json({ error: 'Report ID required' });
    }
    
    // Insert approval request
    const authId = \`auth-\${Date.now()}-\${Math.random().toString(36).substring(2, 15)}\`;
    const query = \`
      INSERT INTO report_authorizations 
      (id, report_id, requester_id, status, requested_at)
      VALUES (?, ?, ?, 'PENDING', datetime('now'))
    \`;
    
    await db.run(query, [authId, reportId, currentUser.id]);
    res.json({ success: true, authId });
  } catch (error) {
    console.error('Request approval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /approval/approve/:id - Approve request
router.post('/approval/approve/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    
    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const query = \`
      UPDATE report_authorizations
      SET status = 'APPROVED',
          approver_id = ?,
          approved_at = datetime('now'),
          expires_at = datetime('now', '+30 minutes')
      WHERE id = ?
    \`;
    
    await db.run(query, [currentUser.id, id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /approval/reject/:id - Reject request
router.post('/approval/reject/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    
    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const query = \`
      UPDATE report_authorizations
      SET status = 'REJECTED',
          approver_id = ?,
          approved_at = datetime('now')
      WHERE id = ?
    \`;
    
    await db.run(query, [currentUser.id, id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Reject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /approval/check - Check if user has valid approval
router.get('/approval/check', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    
    // BOSS and MANAGER always have access
    if (currentUser.role === 'BOSS' || currentUser.role === 'MANAGER') {
      return res.json({ hasAccess: true, role: currentUser.role });
    }
    
    // Check for valid approval
    const query = \`
      SELECT * FROM report_authorizations
      WHERE requester_id = ?
        AND status = 'APPROVED'
        AND expires_at > datetime('now')
      ORDER BY expires_at DESC
      LIMIT 1
    \`;
    
    const auth = await db.get(query, [currentUser.id]);
    res.json({ 
      hasAccess: !!auth,
      authorization: auth || null
    });
  } catch (error) {
    console.error('Check approval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

`;

// Insert before exports
const before = content.substring(0, exportsPos);
const after = content.substring(exportsPos);
const newContent = before + approvalRoutes + after;

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('SUCCESS: Added approval routes to reports.js');
console.log('Routes added:');
console.log('  - GET /approval/pending');
console.log('  - POST /approval/request');
console.log('  - POST /approval/approve/:id');
console.log('  - POST /approval/reject/:id');
console.log('  - GET /approval/check');
