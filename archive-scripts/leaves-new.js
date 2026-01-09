const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Get all leave requests
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    
    let query = 'SELECT * FROM leave_requests';
    let params = [];
    
    // Filter based on user role
    if (currentUser.role === 'BOSS' || currentUser.role === 'MANAGER') {
      // BOSS and MANAGER can see all
    } else if (currentUser.role === 'SUPERVISOR') {
      // Supervisor can see their department
      query += ' WHERE department_id = ?';
      params.push(currentUser.department);
    } else {
      // Regular user can only see their own
      query += ' WHERE user_id = ?';
      params.push(currentUser.id);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const leaves = await db.all(query, params);
    res.json(leaves);
  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single leave request
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    
    const leave = await db.get('SELECT * FROM leave_requests WHERE id = ?', [id]);
    
    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    
    res.json(leave);
  } catch (error) {
    console.error('Get leave error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create leave request
router.post('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { leave_type, start_date, end_date, start_period, end_period, days, reason, proxy_user_id } = req.body;
    
    // Validate required fields
    if (!leave_type || !start_date || !end_date || !days) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const id = `leave-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    // Simple conflict check - check if user has overlapping leaves
    const overlapping = await db.all(
      `SELECT * FROM leave_requests 
       WHERE user_id = ? 
       AND status IN ('PENDING', 'APPROVED', 'CONFLICT')
       AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?))`,
      [currentUser.id, end_date, start_date, start_date, end_date]
    );
    
    const hasConflict = overlapping.length > 0;
    const status = hasConflict ? 'CONFLICT' : 'PENDING';
    const conflictDetails = hasConflict ? JSON.stringify(overlapping.map(l => ({
      id: l.id,
      start_date: l.start_date,
      end_date: l.end_date,
      message: `與現有假期衝突 (${l.start_date} - ${l.end_date})`
    }))) : null;
    
    // Insert leave request
    await db.run(
      `INSERT INTO leave_requests (
        id, user_id, department_id, leave_type, start_date, end_date,
        start_period, end_period, days, reason, status, has_conflict,
        conflict_details, proxy_user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, currentUser.id, currentUser.department, leave_type, start_date, end_date,
        start_period || 'FULL', end_period || 'FULL', days, reason,
        status, hasConflict ? 1 : 0, conflictDetails, proxy_user_id, now, now
      ]
    );
    
    const leave = await db.get('SELECT * FROM leave_requests WHERE id = ?', [id]);
    
    // Broadcast notification via WebSocket
    if (req.wsServer) {
      req.wsServer.broadcastToAll('LEAVE_CREATED', {
        leave: leave,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json(leave);
  } catch (error) {
    console.error('Create leave error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve leave request
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const { approval_notes, conflict_override } = req.body;
    
    // Check permission
    const canApprove = 
      currentUser.role === 'BOSS' || 
      currentUser.role === 'MANAGER' ||
      currentUser.role === 'SUPERVISOR' ||
      (currentUser.permissions && currentUser.permissions.includes('APPROVE_LEAVES'));
    
    if (!canApprove) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const leave = await db.get('SELECT * FROM leave_requests WHERE id = ?', [id]);
    
    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    
    const now = new Date().toISOString();
    
    await db.run(
      `UPDATE leave_requests SET
        status = 'APPROVED',
        approver_id = ?,
        approval_notes = ?,
        conflict_override = ?,
        approved_at = ?,
        updated_at = ?
      WHERE id = ?`,
      [currentUser.id, approval_notes, conflict_override ? 1 : 0, now, now, id]
    );
    
    const updatedLeave = await db.get('SELECT * FROM leave_requests WHERE id = ?', [id]);
    
    // Broadcast update
    if (req.wsServer) {
      req.wsServer.broadcastToAll('LEAVE_UPDATED', {
        leave: updatedLeave,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json(updatedLeave);
  } catch (error) {
    console.error('Approve leave error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reject leave request
router.post('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const { approval_notes } = req.body;
    
    // Check permission
    const canApprove = 
      currentUser.role === 'BOSS' || 
      currentUser.role === 'MANAGER' ||
      currentUser.role === 'SUPERVISOR' ||
      (currentUser.permissions && currentUser.permissions.includes('APPROVE_LEAVES'));
    
    if (!canApprove) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const leave = await db.get('SELECT * FROM leave_requests WHERE id = ?', [id]);
    
    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    
    const now = new Date().toISOString();
    
    await db.run(
      `UPDATE leave_requests SET
        status = 'REJECTED',
        approver_id = ?,
        approval_notes = ?,
        approved_at = ?,
        updated_at = ?
      WHERE id = ?`,
      [currentUser.id, approval_notes, now, now, id]
    );
    
    const updatedLeave = await db.get('SELECT * FROM leave_requests WHERE id = ?', [id]);
    
    // Broadcast update
    if (req.wsServer) {
      req.wsServer.broadcastToAll('LEAVE_UPDATED', {
        leave: updatedLeave,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json(updatedLeave);
  } catch (error) {
    console.error('Reject leave error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete/Cancel leave request
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    
    const leave = await db.get('SELECT * FROM leave_requests WHERE id = ?', [id]);
    
    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    
    // Only owner can cancel their own pending/conflict leaves
    if (leave.user_id !== currentUser.id) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const now = new Date().toISOString();
    
    await db.run(
      'UPDATE leave_requests SET status = ?, updated_at = ? WHERE id = ?',
      ['CANCELLED', now, id]
    );
    
    // Broadcast update
    if (req.wsServer) {
      req.wsServer.broadcastToAll('LEAVE_DELETED', {
        leave_id: id,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete leave error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get department leave rules
router.get('/rules/:departmentId', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { departmentId } = req.params;
    
    const rules = await db.get('SELECT * FROM department_leave_rules WHERE department_id = ?', [departmentId]);
    
    if (!rules) {
      return res.json({
        department_id: departmentId,
        max_concurrent_leaves: 2,
        min_on_duty_staff: 3,
        min_advance_days: 3
      });
    }
    
    res.json(rules);
  } catch (error) {
    console.error('Get rules error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update department leave rules
router.put('/rules/:departmentId', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { departmentId } = req.params;
    const rules = req.body;
    
    // Check permission
    const canManageRules = 
      currentUser.role === 'BOSS' || 
      currentUser.role === 'MANAGER' ||
      (currentUser.role === 'SUPERVISOR' && currentUser.department === departmentId) ||
      (currentUser.permissions && currentUser.permissions.includes('MANAGE_LEAVE_RULES') && currentUser.department === departmentId);
    
    if (!canManageRules) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const existing = await db.get('SELECT * FROM department_leave_rules WHERE department_id = ?', [departmentId]);
    const now = new Date().toISOString();
    
    if (existing) {
      // Update existing rules
      await db.run(
        `UPDATE department_leave_rules SET
          max_concurrent_leaves = ?,
          min_on_duty_staff = ?,
          min_advance_days = ?,
          updated_at = ?
        WHERE department_id = ?`,
        [rules.max_concurrent_leaves, rules.min_on_duty_staff, rules.min_advance_days, now, departmentId]
      );
    } else {
      // Insert new rules
      const id = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await db.run(
        `INSERT INTO department_leave_rules (
          id, department_id, max_concurrent_leaves, min_on_duty_staff, min_advance_days,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, departmentId, rules.max_concurrent_leaves, rules.min_on_duty_staff, rules.min_advance_days, currentUser.id, now, now]
      );
    }
    
    const updatedRules = await db.get('SELECT * FROM department_leave_rules WHERE department_id = ?', [departmentId]);
    res.json(updatedRules);
  } catch (error) {
    console.error('Update rules error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

exports.leavesRoutes = router;
