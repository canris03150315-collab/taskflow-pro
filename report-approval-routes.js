// report-approval-routes.js
// Pure ASCII version - Report approval API routes
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

// POST /api/reports/approval/initiate
// Initiate first approval
router.post('/approval/initiate', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { approverId, reason } = req.body;
    
    // Check role - must be BOSS, MANAGER, or SUPERVISOR
    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER' && currentUser.role !== 'SUPERVISOR') {
      return res.status(403).json({ 
        error: '\u6b0a\u9650\u4e0d\u8db3\uff0c\u53ea\u6709 BOSS\u3001MANAGER \u6216 SUPERVISOR \u53ef\u4ee5\u767c\u8d77\u5be9\u6838' 
        // Permission denied, only BOSS, MANAGER, or SUPERVISOR can initiate
      });
    }
    
    // Validate reason length
    if (!reason || reason.length < 10) {
      return res.status(400).json({ 
        error: '\u5be9\u6838\u539f\u56e0\u81f3\u5c11\u9700\u898110\u500b\u5b57' 
        // Reason must be at least 10 characters
      });
    }
    
    // Check if approver exists
    const approver = await db.get('SELECT * FROM users WHERE id = ?', [approverId]);
    if (!approver) {
      return res.status(404).json({ 
        error: '\u627e\u4e0d\u5230\u6307\u5b9a\u7684\u5be9\u6838\u8005' 
        // Approver not found
      });
    }
    
    // Check approver role
    if (approver.role !== 'BOSS' && approver.role !== 'MANAGER' && approver.role !== 'SUPERVISOR') {
      return res.status(400).json({ 
        error: '\u5be9\u6838\u8005\u5fc5\u9808\u662f BOSS\u3001MANAGER \u6216 SUPERVISOR' 
        // Approver must be BOSS, MANAGER, or SUPERVISOR
      });
    }
    
    // Check not same person
    if (approverId === currentUser.id) {
      return res.status(400).json({ 
        error: '\u4e0d\u80fd\u9078\u64c7\u81ea\u5df1\u4f5c\u70ba\u5be9\u6838\u8005' 
        // Cannot select yourself as approver
      });
    }
    
    // Check different department
    if (approver.department === currentUser.department) {
      return res.status(400).json({ 
        error: '\u5be9\u6838\u8005\u5fc5\u9808\u4f86\u81ea\u4e0d\u540c\u90e8\u9580' 
        // Approver must be from different department
      });
    }
    
    // Create pending authorization (waiting for second approval)
    const authId = generateId();
    const now = new Date().toISOString();
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    await db.run(`
      INSERT INTO report_authorizations (
        id,
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      authId,
      currentUser.id,
      currentUser.name,
      currentUser.department,
      now,
      reason,
      clientIp,
      approverId,
      approver.name,
      approver.department,
      '', // pending
      '', // pending
      '',
      '', // pending
      '', // pending
      0,  // not active yet
      '',
      userAgent,
      now
    ]);
    
    res.json({ 
      success: true, 
      authorizationId: authId,
      message: '\u7b2c\u4e00\u6b21\u5be9\u6838\u5b8c\u6210\uff0c\u7b49\u5f85\u7b2c\u4e8c\u5be9\u6838' 
      // First approval complete, waiting for second approval
    });
    
  } catch (error) {
    console.error('Initiate approval error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' }); // Server error
  }
});

// POST /api/reports/approval/complete
// Complete second approval
router.post('/approval/complete', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { authorizationId, reason } = req.body;
    
    // Check role
    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER') {
      return res.status(403).json({ 
        error: '\u6b0a\u9650\u4e0d\u8db3' 
        // Permission denied
      });
    }
    
    // Validate reason
    if (!reason || reason.length < 10) {
      return res.status(400).json({ 
        error: '\u5be9\u6838\u539f\u56e0\u81f3\u5c11\u9700\u898110\u500b\u5b57' 
        // Reason must be at least 10 characters
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
        // Authorization not found
      });
    }
    
    // Check if already completed
    if (auth.is_active === 1) {
      return res.status(400).json({ 
        error: '\u6b64\u5be9\u6838\u5df2\u5b8c\u6210' 
        // Already completed
      });
    }
    
    // Check if current user is the designated second approver
    if (currentUser.id !== auth.second_approver_id) {
      return res.status(403).json({ 
        error: '\u60a8\u4e0d\u662f\u6307\u5b9a\u7684\u7b2c\u4e8c\u5be9\u6838\u8005' 
        // You are not the designated second approver
      });
    }
    
    // Complete the authorization
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
    const sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const clientIp = getClientIp(req);
    
    await db.run(`
      UPDATE report_authorizations 
      SET 
        second_approved_at = ?,
        second_approval_reason = ?,
        second_approval_ip = ?,
        authorized_at = ?,
        expires_at = ?,
        is_active = 1,
        session_id = ?
      WHERE id = ?
    `, [now, reason, clientIp, now, expiresAt, sessionId, authorizationId]);
    
    // Get updated authorization
    const updatedAuth = await db.get(
      'SELECT * FROM report_authorizations WHERE id = ?',
      [authorizationId]
    );
    
    res.json({ 
      success: true,
      authorization: {
        id: updatedAuth.id,
        firstApproverId: updatedAuth.first_approver_id,
        firstApproverName: updatedAuth.first_approver_name,
        firstApproverDept: updatedAuth.first_approver_dept,
        firstApprovedAt: updatedAuth.first_approved_at,
        firstApprovalReason: updatedAuth.first_approval_reason,
        secondApproverId: updatedAuth.second_approver_id,
        secondApproverName: updatedAuth.second_approver_name,
        secondApproverDept: updatedAuth.second_approver_dept,
        secondApprovedAt: updatedAuth.second_approved_at,
        secondApprovalReason: updatedAuth.second_approval_reason,
        authorizedAt: updatedAuth.authorized_at,
        expiresAt: updatedAuth.expires_at,
        isActive: updatedAuth.is_active === 1,
        sessionId: updatedAuth.session_id
      },
      message: '\u5be9\u6838\u5b8c\u6210\uff0c\u6388\u6b0a\u6709\u670930\u5206\u9418' 
      // Approval complete, authorization valid for 30 minutes
    });
    
  } catch (error) {
    console.error('Complete approval error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' }); // Server error
  }
});

// GET /api/reports/approval/status
// Check authorization status
router.get('/approval/status', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const sessionId = req.headers['x-session-id'];
    
    if (!sessionId) {
      return res.json({ 
        isAuthorized: false,
        message: '\u672a\u627e\u5230\u6703\u8a71 ID' 
        // Session ID not found
      });
    }
    
    // Get active authorization
    const auth = await db.get(`
      SELECT * FROM report_authorizations 
      WHERE session_id = ? 
        AND is_active = 1 
        AND datetime(expires_at) > datetime('now')
    `, [sessionId]);
    
    if (!auth) {
      return res.json({ 
        isAuthorized: false,
        message: '\u6388\u6b0a\u5df2\u904e\u671f\u6216\u4e0d\u5b58\u5728' 
        // Authorization expired or not found
      });
    }
    
    // Calculate remaining time
    const expiresAt = new Date(auth.expires_at);
    const now = new Date();
    const remainingTime = Math.floor((expiresAt - now) / 1000); // seconds
    
    res.json({
      isAuthorized: true,
      authorization: {
        id: auth.id,
        firstApproverId: auth.first_approver_id,
        firstApproverName: auth.first_approver_name,
        firstApproverDept: auth.first_approver_dept,
        firstApprovedAt: auth.first_approved_at,
        secondApproverId: auth.second_approver_id,
        secondApproverName: auth.second_approver_name,
        secondApproverDept: auth.second_approver_dept,
        secondApprovedAt: auth.second_approved_at,
        authorizedAt: auth.authorized_at,
        expiresAt: auth.expires_at,
        isActive: true,
        sessionId: auth.session_id
      },
      remainingTime: remainingTime
    });
    
  } catch (error) {
    console.error('Check status error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' }); // Server error
  }
});

// GET /api/reports/approval/eligible-approvers
// Get list of eligible approvers
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
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' }); // Server error
  }
});

// GET /api/reports/approval/pending
// Get pending approvals for current user
router.get('/approval/pending', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    
    // Get pending authorizations where current user is second approver
    const pending = await db.all(`
      SELECT * FROM report_authorizations 
      WHERE second_approver_id = ?
        AND is_active = 0
        AND second_approved_at = ''
      ORDER BY created_at DESC
    `, [currentUser.id]);
    
    res.json({
      success: true,
      pending: pending.map(p => ({
        id: p.id,
        firstApproverId: p.first_approver_id,
        firstApproverName: p.first_approver_name,
        firstApproverDept: p.first_approver_dept,
        firstApprovedAt: p.first_approved_at,
        firstApprovalReason: p.first_approval_reason,
        createdAt: p.created_at
      }))
    });
    
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' }); // Server error
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
      // Revoke specific authorization
      await db.run(`
        UPDATE report_authorizations 
        SET is_active = 0 
        WHERE id = ? 
          AND (first_approver_id = ? OR second_approver_id = ?)
      `, [authorizationId, currentUser.id, currentUser.id]);
    } else {
      // Revoke all user's authorizations
      await db.run(`
        UPDATE report_authorizations 
        SET is_active = 0 
        WHERE first_approver_id = ? OR second_approver_id = ?
      `, [currentUser.id, currentUser.id]);
    }
    
    res.json({ 
      success: true,
      message: '\u6388\u6b0a\u5df2\u64a4\u92b7' 
      // Authorization revoked
    });
    
  } catch (error) {
    console.error('Revoke authorization error:', error);
    res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' }); // Server error
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
