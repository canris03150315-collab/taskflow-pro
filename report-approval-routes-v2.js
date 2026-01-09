// report-approval-routes-v2.js
// Pure ASCII version - Simplified approval: A requests -> B approves -> A gets access
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Helper function to get client IP
function getClientIp(req) {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         'unknown';
}

// Helper function to generate ID
function generateId() {
  return 'auth-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// POST /api/reports/approval/request
// Requester (A) requests approval from approver (B)
router.post('/approval/request', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user; // This is the REQUESTER (A)
    const { approverId, reason } = req.body;
    
    // Check role - must be BOSS, MANAGER, or SUPERVISOR
    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER' && currentUser.role !== 'SUPERVISOR') {
      return res.status(403).json({ 
        error: '\u6b0a\u9650\u4e0d\u8db3\uff0c\u53ea\u6709 BOSS\u3001MANAGER \u6216 SUPERVISOR \u53ef\u4ee5\u7533\u8acb\u67e5\u770b\u5831\u8868' 
      });
    }
    
    // Validate reason length
    if (!reason || reason.length < 10) {
      return res.status(400).json({ 
        error: '\u7533\u8acb\u539f\u56e0\u81f3\u5c11\u9700\u898110\u500b\u5b57' 
      });
    }
    
    // Check if approver exists
    const approver = await db.get('SELECT * FROM users WHERE id = ?', [approverId]);
    if (!approver) {
      return res.status(404).json({ 
        error: '\u627e\u4e0d\u5230\u6307\u5b9a\u7684\u5be9\u6838\u8005' 
      });
    }
    
    // Check approver role
    if (approver.role !== 'BOSS' && approver.role !== 'MANAGER' && approver.role !== 'SUPERVISOR') {
      return res.status(400).json({ 
        error: '\u5be9\u6838\u8005\u5fc5\u9808\u662f BOSS\u3001MANAGER \u6216 SUPERVISOR' 
      });
    }
    
    // Check not same person
    if (approverId === currentUser.id) {
      return res.status(400).json({ 
        error: '\u4e0d\u80fd\u9078\u64c7\u81ea\u5df1\u4f5c\u70ba\u5be9\u6838\u8005' 
      });
    }
    
    // Check different department
    if (approver.department === currentUser.department) {
      return res.status(400).json({ 
        error: '\u5be9\u6838\u8005\u5fc5\u9808\u4f86\u81ea\u4e0d\u540c\u90e8\u9580' 
      });
    }
    
    // Create pending authorization
    const authId = generateId();
    const now = new Date().toISOString();
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    await db.run(`
      INSERT INTO report_authorizations (
        id,
        requester_id,
        first_approver_id,
        first_approver_name,
        first_approver_dept,
        first_approved_at,
        first_approval_reason,
        first_approval_ip,
        second_approver_id,
        second_approver_name,
        second_approver_dept,
        second_approved_at,
        second_approval_reason,
        second_approval_ip,
        authorized_at,
        expires_at,
        is_active,
        session_id,
        user_agent,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      authId,
      currentUser.id,  // REQUESTER (A) - the person who will get access
      approverId,      // APPROVER (B) - the person who will approve
      approver.name,
      approver.department,
      '',  // pending approval
      '',  // pending
      '',
      '',  // not used in single approval
      '',
      '',
      '',
      '',
      '',
      '',  // pending
      '',  // pending
      0,   // not active yet
      '',
      userAgent,
      now
    ]);
    
    res.json({ 
      success: true, 
      authorizationId: authId,
      message: '\u7533\u8acb\u5df2\u767c\u9001\uff0c\u7b49\u5f85\u5be9\u6838\u8005\u6279\u51c6' 
    });
    
  } catch (error) {
    console.error('Request approval error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

// POST /api/reports/approval/approve
// Approver (B) approves the request, giving access to requester (A)
router.post('/approval/approve', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user; // This is the APPROVER (B)
    const { authorizationId, reason } = req.body;
    
    // Check role
    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER' && currentUser.role !== 'SUPERVISOR') {
      return res.status(403).json({ 
        error: '\u6b0a\u9650\u4e0d\u8db3\uff0c\u53ea\u6709 BOSS\u3001MANAGER \u6216 SUPERVISOR \u53ef\u4ee5\u5be9\u6838' 
      });
    }
    
    // Validate reason
    if (!reason || reason.length < 10) {
      return res.status(400).json({ 
        error: '\u5be9\u6838\u539f\u56e0\u81f3\u5c11\u9700\u898110\u500b\u5b57' 
      });
    }
    
    // Get authorization
    const auth = await db.get(
      'SELECT * FROM report_authorizations WHERE id = ?',
      [authorizationId]
    );
    
    if (!auth) {
      return res.status(404).json({ 
        error: '\u627e\u4e0d\u5230\u5be9\u6838\u8a18\u9304' 
      });
    }
    
    // Check if already approved
    if (auth.is_active === 1) {
      return res.status(400).json({ 
        error: '\u6b64\u7533\u8acb\u5df2\u7d93\u6279\u51c6' 
      });
    }
    
    // Check if current user is the designated approver
    if (currentUser.id !== auth.first_approver_id) {
      return res.status(403).json({ 
        error: '\u60a8\u4e0d\u662f\u6307\u5b9a\u7684\u5be9\u6838\u8005' 
      });
    }
    
    // CRITICAL: Check if approver is the same as requester (prevent self-approval)
    if (currentUser.id === auth.requester_id) {
      return res.status(403).json({ 
        error: '\u4e0d\u80fd\u5be9\u6838\u81ea\u5df1\u7684\u7533\u8acb' 
      });
    }
    
    // Approve and activate authorization for REQUESTER
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
    const sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const clientIp = getClientIp(req);
    
    await db.run(`
      UPDATE report_authorizations 
      SET 
        first_approved_at = ?,
        first_approval_reason = ?,
        first_approval_ip = ?,
        authorized_at = ?,
        expires_at = ?,
        is_active = 1,
        session_id = ?
      WHERE id = ?
    `, [now, reason, clientIp, now, expiresAt, sessionId, authorizationId]);
    
    // Get requester info and updated authorization
    const requester = await db.get('SELECT * FROM users WHERE id = ?', [auth.requester_id]);
    const updatedAuth = await db.get('SELECT * FROM report_authorizations WHERE id = ?', [authorizationId]);
    
    res.json({ 
      success: true,
      message: '\u5be9\u6838\u5b8c\u6210\uff0c' + requester.name + ' \u5df2\u7372\u5f97\u67e5\u770b\u6b0a\u96502030\u5206\u9418',
      requesterName: requester.name,
      authorization: {
        id: updatedAuth.id,
        approverId: updatedAuth.first_approver_id,
        approverName: updatedAuth.first_approver_name,
        approverDept: updatedAuth.first_approver_dept,
        approvedAt: updatedAuth.first_approved_at,
        approvalReason: updatedAuth.first_approval_reason,
        authorizedAt: updatedAuth.authorized_at,
        expiresAt: updatedAuth.expires_at,
        isActive: true,
        sessionId: updatedAuth.session_id
      }
    });
    
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

// POST /api/reports/approval/reject
// Reject approval request
router.post('/approval/reject', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { authorizationId, reason } = req.body;
    
    // Check role
    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER' && currentUser.role !== 'SUPERVISOR') {
      return res.status(403).json({ 
        error: '\u6b0a\u9650\u4e0d\u8db3\uff0c\u53ea\u6709 BOSS\u3001MANAGER \u6216 SUPERVISOR \u53ef\u4ee5\u5be9\u6838' 
      });
    }
    
    // Validate reason
    if (!reason || reason.length < 10) {
      return res.status(400).json({ 
        error: '\u62d2\u7d55\u539f\u56e0\u81f3\u5c11\u9700\u898110\u500b\u5b57' 
      });
    }
    
    // Get authorization
    const auth = await db.get(
      'SELECT * FROM report_authorizations WHERE id = ?',
      [authorizationId]
    );
    
    if (!auth) {
      return res.status(404).json({ 
        error: '\u627e\u4e0d\u5230\u5be9\u6838\u8a18\u9304' 
      });
    }
    
    // Check if already processed
    if (auth.is_active === 1 || auth.first_approved_at !== '') {
      return res.status(400).json({ 
        error: '\u6b64\u7533\u8acb\u5df2\u7d93\u8655\u7406' 
      });
    }
    
    // Check if current user is the designated approver
    if (currentUser.id !== auth.first_approver_id) {
      return res.status(403).json({ 
        error: '\u60a8\u4e0d\u662f\u6307\u5b9a\u7684\u5be9\u6838\u8005' 
      });
    }
    
    // CRITICAL: Check if approver is the same as requester (prevent self-rejection)
    if (currentUser.id === auth.requester_id) {
      return res.status(403).json({ 
        error: '\u4e0d\u80fd\u5be9\u6838\u81ea\u5df1\u7684\u7533\u8acb' 
      });
    }
    
    // Get requester info
    const requester = await db.get('SELECT * FROM users WHERE id = ?', [auth.requester_id]);
    
    // Delete the rejected authorization request
    await db.run('DELETE FROM report_authorizations WHERE id = ?', [authorizationId]);
    
    res.json({
      success: true,
      message: '\u5df2\u62d2\u7d55 ' + requester.name + ' \u7684\u67e5\u770b\u7533\u8acb',
      requesterName: requester.name,
      rejectReason: reason
    });
    
  } catch (error) {
    console.error('Reject error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

// GET /api/reports/approval/status
// Check if current user (requester) has active authorization
router.get('/approval/status', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    
    // Find active authorization for current user as REQUESTER
    const auth = await db.get(`
      SELECT * FROM report_authorizations 
      WHERE requester_id = ?
        AND is_active = 1 
        AND datetime(expires_at) > datetime('now')
      ORDER BY authorized_at DESC
      LIMIT 1
    `, [currentUser.id]);
    
    if (!auth) {
      return res.json({ 
        isAuthorized: false,
        message: '\u672a\u627e\u5230\u6709\u6548\u6388\u6b0a' 
      });
    }
    
    // Calculate remaining time
    const expiresAt = new Date(auth.expires_at);
    const now = new Date();
    const remainingTime = Math.floor((expiresAt - now) / 1000);
    
    res.json({
      isAuthorized: true,
      authorization: {
        id: auth.id,
        approverId: auth.first_approver_id,
        approverName: auth.first_approver_name,
        approverDept: auth.first_approver_dept,
        approvedAt: auth.first_approved_at,
        approvalReason: auth.first_approval_reason,
        authorizedAt: auth.authorized_at,
        expiresAt: auth.expires_at,
        isActive: true,
        sessionId: auth.session_id
      },
      remainingTime: remainingTime
    });
    
  } catch (error) {
    console.error('Check status error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

// GET /api/reports/approval/eligible-approvers
// Get list of eligible approvers for current user
router.get('/approval/eligible-approvers', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    
    // Get all BOSS, MANAGER, and SUPERVISOR users except current user and same department
    const approvers = await db.all(`
      SELECT id, name, role, department 
      FROM users 
      WHERE (role = 'BOSS' OR role = 'MANAGER' OR role = 'SUPERVISOR')
        AND id != ?
        AND department != ?
      ORDER BY 
        CASE role 
          WHEN 'BOSS' THEN 1 
          WHEN 'MANAGER' THEN 2 
          WHEN 'SUPERVISOR' THEN 3 
        END,
        name ASC
    `, [currentUser.id, currentUser.department]);
    
    res.json({
      success: true,
      approvers: approvers.map(a => ({
        id: a.id,
        name: a.name,
        role: a.role,
        department: a.department
      }))
    });
    
  } catch (error) {
    console.error('Get eligible approvers error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

// GET /api/reports/approval/pending
// Get pending approval requests for current user (as approver)
router.get('/approval/pending', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    
    // Get pending authorizations where current user is the approver
    const pending = await db.all(`
      SELECT ra.*, u.name as requester_name, u.department as requester_dept
      FROM report_authorizations ra
      JOIN users u ON ra.requester_id = u.id
      WHERE ra.first_approver_id = ?
        AND ra.is_active = 0
        AND ra.first_approved_at = ''
      ORDER BY ra.created_at DESC
    `, [currentUser.id]);
    
    res.json({
      success: true,
      pending: pending.map(p => ({
        id: p.id,
        requesterId: p.requester_id,
        requesterName: p.requester_name,
        requesterDept: p.requester_dept,
        createdAt: p.created_at
      }))
    });
    
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

// POST /api/reports/approval/revoke
// Revoke authorization
router.post('/approval/revoke', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { authorizationId } = req.body;
    
    if (authorizationId) {
      // Revoke specific authorization (only if user is the requester)
      await db.run(`
        UPDATE report_authorizations 
        SET is_active = 0 
        WHERE id = ? 
          AND requester_id = ?
      `, [authorizationId, currentUser.id]);
    } else {
      // Revoke all user's authorizations
      await db.run(`
        UPDATE report_authorizations 
        SET is_active = 0 
        WHERE requester_id = ?
      `, [currentUser.id]);
    }
    
    res.json({ 
      success: true, 
      message: '\u6388\u6b0a\u5df2\u64a4\u92b7' 
    });
    
  } catch (error) {
    console.error('Revoke error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
  }
});

// Cleanup expired authorizations (called periodically)
async function cleanupExpiredAuthorizations(db) {
  try {
    await db.run(`
      UPDATE report_authorizations
      SET is_active = 0
      WHERE is_active = 1
        AND datetime(expires_at) < datetime('now')
    `);
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// Export router and cleanup function
module.exports = {
  reportApprovalRoutes: router,
  cleanupExpiredAuthorizations
};
