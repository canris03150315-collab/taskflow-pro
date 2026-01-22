const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// dbCall adapter for compatibility
async function dbCall(db, method, query, params = []) {
  if (db.prepare) {
    const stmt = db.prepare(query);
    if (method === 'get') return stmt.get(...params);
    if (method === 'all') return stmt.all(...params);
    if (method === 'run') return stmt.run(...params);
  } else {
    if (method === 'get') return await db.get(query, params);
    if (method === 'all') return await db.all(query, params);
    if (method === 'run') return await db.run(query, params);
  }
}

// Create report_authorizations table if not exists
const initAuthTable = async (db) => {
  await dbCall(db, 'run', `
    CREATE TABLE IF NOT EXISTS report_authorizations (
      id TEXT PRIMARY KEY,
      requester_id TEXT NOT NULL,
      requester_name TEXT NOT NULL,
      requester_dept TEXT NOT NULL,
      first_approver_id TEXT,
      first_approver_name TEXT,
      first_approver_dept TEXT,
      first_approved_at TEXT,
      first_approval_reason TEXT,
      second_approver_id TEXT,
      second_approver_name TEXT,
      second_approver_dept TEXT,
      second_approved_at TEXT,
      second_approval_reason TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      expires_at TEXT,
      revoked_at TEXT,
      reject_reason TEXT
    )
  `, []);
};

// GET / - Get reports
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    
    let reports;
    if (currentUser.role === 'EMPLOYEE') {
      reports = await dbCall(db, 'all', 
        'SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', 
        [currentUser.id]
      );
    } else {
      reports = await dbCall(db, 'all', 
        'SELECT * FROM reports ORDER BY created_at DESC LIMIT 50', 
        []
      );
    }
    
    for (const r of reports) {
      try { r.content = JSON.parse(r.content || '{}'); } catch(e) { r.content = {}; }
    }
    
    res.json({ reports });
  } catch (error) {
    console.error('GET /reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - Create report
router.post('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { type, content } = req.body;
    
    const id = `report-${Date.now()}`;
    const now = new Date().toISOString();
    
    await dbCall(db, 'run',
      'INSERT INTO reports (id, type, user_id, created_at, content) VALUES (?, ?, ?, ?, ?)',
      [id, type || 'DAILY', currentUser.id, now, JSON.stringify(content)]
    );
    
    const report = await dbCall(db, 'get', 'SELECT * FROM reports WHERE id = ?', [id]);
    if (report) {
      try { report.content = JSON.parse(report.content || '{}'); } catch(e) { report.content = {}; }
    }
    
    res.json({ success: true, report });
  } catch (error) {
    console.error('POST /reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - Update report
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const { content } = req.body;
    
    const report = await dbCall(db, 'get', 'SELECT * FROM reports WHERE id = ?', [id]);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    if (report.user_id !== currentUser.id && currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const now = new Date().toISOString();
    await dbCall(db, 'run',
      'UPDATE reports SET content = ?, updated_at = ? WHERE id = ?',
      [JSON.stringify(content), now, id]
    );
    
    const updated = await dbCall(db, 'get', 'SELECT * FROM reports WHERE id = ?', [id]);
    if (updated) {
      try { updated.content = JSON.parse(updated.content || '{}'); } catch(e) { updated.content = {}; }
    }
    
    res.json({ success: true, report: updated });
  } catch (error) {
    console.error('PUT /reports/:id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - Delete report
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    
    const report = await dbCall(db, 'get', 'SELECT * FROM reports WHERE id = ?', [id]);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    if (report.user_id !== currentUser.id && currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    await dbCall(db, 'run', 'DELETE FROM reports WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /reports/:id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== APPROVAL ROUTES ====================

// GET /approval/eligible-approvers
router.get('/approval/eligible-approvers', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    
    // Get all BOSS, MANAGER, SUPERVISOR from different departments
    const approvers = await dbCall(db, 'all',
      `SELECT id, name, role, department FROM users 
       WHERE (role = 'BOSS' OR role = 'MANAGER' OR role = 'SUPERVISOR')
       AND department != ?
       AND id != ?`,
      [currentUser.department, currentUser.id]
    );
    
    res.json({ success: true, approvers });
  } catch (error) {
    console.error('GET /approval/eligible-approvers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /approval/request
router.post('/approval/request', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { approverId, reason } = req.body;
    
    await initAuthTable(db);
    
    const approver = await dbCall(db, 'get', 'SELECT * FROM users WHERE id = ?', [approverId]);
    if (!approver) {
      return res.status(404).json({ error: 'Approver not found' });
    }
    
    const authId = `auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    await dbCall(db, 'run',
      `INSERT INTO report_authorizations 
       (id, requester_id, requester_name, requester_dept, first_approver_id, 
        first_approver_name, first_approver_dept, first_approved_at, first_approval_reason, 
        status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_second', ?)`,
      [authId, currentUser.id, currentUser.name, currentUser.department,
       currentUser.id, currentUser.name, currentUser.department, now, reason,
       now]
    );
    
    res.json({ success: true, authorizationId: authId, message: '\u8acb\u6c42\u5df2\u767c\u9001' });
  } catch (error) {
    console.error('POST /approval/request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /approval/pending
router.get('/approval/pending', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    
    await initAuthTable(db);
    
    // Get pending approvals where current user can be second approver
    const pending = await dbCall(db, 'all',
      `SELECT * FROM report_authorizations 
       WHERE status = 'pending_second' 
       AND first_approver_dept != ?
       AND first_approver_id != ?
       ORDER BY created_at DESC`,
      [currentUser.department, currentUser.id]
    );
    
    res.json({ success: true, pending });
  } catch (error) {
    console.error('GET /approval/pending error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /approval/check - Check authorization status
router.get('/approval/check', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    
    await initAuthTable(db);
    
    // Check if user has active authorization
    const auth = await dbCall(db, 'get',
      `SELECT * FROM report_authorizations 
       WHERE requester_id = ? 
       AND status = 'approved' 
       AND (expires_at IS NULL OR expires_at > ?)
       ORDER BY created_at DESC LIMIT 1`,
      [currentUser.id, new Date().toISOString()]
    );
    
    if (auth) {
      res.json({ 
        isAuthorized: true, 
        authorization: auth
      });
    } else {
      res.json({ isAuthorized: false });
    }
  } catch (error) {
    console.error('GET /approval/check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /approval/approve
router.post('/approval/approve', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { authorizationId, reason } = req.body;
    
    await initAuthTable(db);
    
    const auth = await dbCall(db, 'get',
      'SELECT * FROM report_authorizations WHERE id = ?',
      [authorizationId]
    );
    
    if (!auth) {
      return res.status(404).json({ error: 'Authorization not found' });
    }
    
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
    
    await dbCall(db, 'run',
      `UPDATE report_authorizations 
       SET second_approver_id = ?, second_approver_name = ?, second_approver_dept = ?,
           second_approved_at = ?, second_approval_reason = ?, 
           status = 'approved', expires_at = ?
       WHERE id = ?`,
      [currentUser.id, currentUser.name, currentUser.department,
       now, reason, expiresAt, authorizationId]
    );
    
    res.json({ 
      success: true, 
      message: '\u5df2\u6279\u51c6\u6388\u6b0a',
      requesterName: auth.requester_name
    });
  } catch (error) {
    console.error('POST /approval/approve error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /approval/reject
router.post('/approval/reject', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { authorizationId, reason } = req.body;
    
    await initAuthTable(db);
    
    const auth = await dbCall(db, 'get',
      'SELECT * FROM report_authorizations WHERE id = ?',
      [authorizationId]
    );
    
    if (!auth) {
      return res.status(404).json({ error: 'Authorization not found' });
    }
    
    await dbCall(db, 'run',
      'UPDATE report_authorizations SET status = \'rejected\', reject_reason = ? WHERE id = ?',
      [reason, authorizationId]
    );
    
    res.json({ 
      success: true, 
      message: '\u5df2\u62d2\u7d55\u6388\u6b0a',
      requesterName: auth.requester_name,
      rejectReason: reason
    });
  } catch (error) {
    console.error('POST /approval/reject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /approval/revoke
router.post('/approval/revoke', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { authorizationId } = req.body;
    
    await initAuthTable(db);
    
    if (authorizationId) {
      await dbCall(db, 'run',
        'UPDATE report_authorizations SET status = \'revoked\', revoked_at = ? WHERE id = ?',
        [new Date().toISOString(), authorizationId]
      );
    } else {
      // Revoke all active authorizations for current user
      await dbCall(db, 'run',
        'UPDATE report_authorizations SET status = \'revoked\', revoked_at = ? WHERE requester_id = ? AND status = \'approved\'',
        [new Date().toISOString(), currentUser.id]
      );
    }
    
    res.json({ success: true, message: '\u6388\u6b0a\u5df2\u64a4\u92b7' });
  } catch (error) {
    console.error('POST /approval/revoke error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /approval/audit-log
router.get('/approval/audit-log', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    
    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    await initAuthTable(db);
    
    const { limit = 50, offset = 0 } = req.query;
    
    const logs = await dbCall(db, 'all',
      'SELECT * FROM report_authorizations ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [parseInt(limit), parseInt(offset)]
    );
    
    const total = await dbCall(db, 'get',
      'SELECT COUNT(*) as count FROM report_authorizations',
      []
    );
    
    res.json({ 
      success: true, 
      logs, 
      total: total.count, 
      limit: parseInt(limit), 
      offset: parseInt(offset) 
    });
  } catch (error) {
    console.error('GET /approval/audit-log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
