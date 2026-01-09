const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

function dbCall(db, method, ...args) {
  try {
    return db[method](...args);
  } catch (error) {
    console.error(`Database ${method} error:`, error);
    throw error;
  }
}

// Get all leave requests
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    
    let query = 'SELECT * FROM leave_requests';
    let params = [];
    
    // Filter based on user role
    if (currentUser.role === 'BOSS') {
      // BOSS can see all
    } else if (currentUser.role === 'SUPERVISOR') {
      // Supervisor can see their department
      query += ' WHERE department_id = ?';
      params.push(currentUser.department_id);
    } else {
      // Regular user can only see their own
      query += ' WHERE user_id = ?';
      params.push(currentUser.id);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const leaves = dbCall(db, 'prepare', query).all(...params);
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
    
    const leave = dbCall(db, 'prepare', 'SELECT * FROM leave_requests WHERE id = ?').get(id);
    
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
    
    const id = `leave-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    // Check conflict
    const conflictCheck = await checkLeaveConflict(db, {
      user_id: currentUser.id,
      department_id: currentUser.department_id,
      start_date,
      end_date
    });
    
    dbCall(db, 'prepare', `
      INSERT INTO leave_requests (
        id, user_id, department_id, leave_type, start_date, end_date,
        start_period, end_period, days, reason, status, has_conflict,
        conflict_details, proxy_user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, currentUser.id, currentUser.department_id, leave_type, start_date, end_date,
      start_period || 'FULL', end_period || 'FULL', days, reason,
      conflictCheck.hasConflict ? 'CONFLICT' : 'PENDING',
      conflictCheck.hasConflict ? 1 : 0,
      conflictCheck.hasConflict ? JSON.stringify(conflictCheck.conflicts) : null,
      proxy_user_id, now, now
    );
    
    const leave = dbCall(db, 'prepare', 'SELECT * FROM leave_requests WHERE id = ?').get(id);
    
    // Send notification
    if (conflictCheck.hasConflict) {
      await sendLeaveNotification(db, req.wsServer, {
        leave_request_id: id,
        user_id: currentUser.id,
        type: 'CONFLICT',
        message: `Your leave request has conflicts: ${conflictCheck.conflicts.map(c => c.message).join(', ')}`
      });
      
      // Notify supervisor
      const supervisor = getSupervisor(db, currentUser.department_id);
      if (supervisor) {
        await sendLeaveNotification(db, req.wsServer, {
          leave_request_id: id,
          user_id: supervisor.id,
          type: 'CONFLICT',
          message: `${currentUser.name} submitted a leave request with conflicts`
        });
      }
    } else {
      // Notify supervisor
      const supervisor = getSupervisor(db, currentUser.department_id);
      if (supervisor) {
        await sendLeaveNotification(db, req.wsServer, {
          leave_request_id: id,
          user_id: supervisor.id,
          type: 'NEW_REQUEST',
          message: `${currentUser.name} submitted a leave request`
        });
      }
    }
    
    // Broadcast update
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

// Update leave request
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const { leave_type, start_date, end_date, start_period, end_period, days, reason, proxy_user_id } = req.body;
    
    const leave = dbCall(db, 'prepare', 'SELECT * FROM leave_requests WHERE id = ?').get(id);
    
    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    
    // Only allow update if pending or conflict
    if (leave.status !== 'PENDING' && leave.status !== 'CONFLICT') {
      return res.status(400).json({ error: 'Cannot update approved or rejected leave' });
    }
    
    // Check conflict
    const conflictCheck = await checkLeaveConflict(db, {
      user_id: currentUser.id,
      department_id: currentUser.department_id,
      start_date,
      end_date,
      exclude_id: id
    });
    
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', `
      UPDATE leave_requests SET
        leave_type = ?, start_date = ?, end_date = ?,
        start_period = ?, end_period = ?, days = ?, reason = ?,
        status = ?, has_conflict = ?, conflict_details = ?,
        proxy_user_id = ?, updated_at = ?
      WHERE id = ?
    `).run(
      leave_type, start_date, end_date,
      start_period || 'FULL', end_period || 'FULL', days, reason,
      conflictCheck.hasConflict ? 'CONFLICT' : 'PENDING',
      conflictCheck.hasConflict ? 1 : 0,
      conflictCheck.hasConflict ? JSON.stringify(conflictCheck.conflicts) : null,
      proxy_user_id, now, id
    );
    
    const updatedLeave = dbCall(db, 'prepare', 'SELECT * FROM leave_requests WHERE id = ?').get(id);
    
    // Broadcast update
    if (req.wsServer) {
      req.wsServer.broadcastToAll('LEAVE_UPDATED', {
        leave: updatedLeave,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json(updatedLeave);
  } catch (error) {
    console.error('Update leave error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete/Cancel leave request
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    
    const leave = dbCall(db, 'prepare', 'SELECT * FROM leave_requests WHERE id = ?').get(id);
    
    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', 'UPDATE leave_requests SET status = ?, updated_at = ? WHERE id = ?')
      .run('CANCELLED', now, id);
    
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

// Approve leave request
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const { approval_notes, conflict_override } = req.body;
    
    // Check permission
    if (currentUser.role !== 'SUPERVISOR' && currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const leave = dbCall(db, 'prepare', 'SELECT * FROM leave_requests WHERE id = ?').get(id);
    
    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', `
      UPDATE leave_requests SET
        status = 'APPROVED',
        approver_id = ?,
        approval_notes = ?,
        conflict_override = ?,
        approved_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(currentUser.id, approval_notes, conflict_override ? 1 : 0, now, now, id);
    
    // Update leave quota
    updateLeaveQuota(db, leave.user_id, leave.leave_type, leave.days, 'use');
    
    // Send notification to employee
    await sendLeaveNotification(db, req.wsServer, {
      leave_request_id: id,
      user_id: leave.user_id,
      type: 'APPROVED',
      message: `Your leave request has been approved by ${currentUser.name}`
    });
    
    // Integrate with attendance system
    await integrateWithAttendance(db, leave);
    
    const updatedLeave = dbCall(db, 'prepare', 'SELECT * FROM leave_requests WHERE id = ?').get(id);
    
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
    if (currentUser.role !== 'SUPERVISOR' && currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const leave = dbCall(db, 'prepare', 'SELECT * FROM leave_requests WHERE id = ?').get(id);
    
    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', `
      UPDATE leave_requests SET
        status = 'REJECTED',
        approver_id = ?,
        approval_notes = ?,
        updated_at = ?
      WHERE id = ?
    `).run(currentUser.id, approval_notes, now, id);
    
    // Send notification to employee
    await sendLeaveNotification(db, req.wsServer, {
      leave_request_id: id,
      user_id: leave.user_id,
      type: 'REJECTED',
      message: `Your leave request has been rejected by ${currentUser.name}`
    });
    
    const updatedLeave = dbCall(db, 'prepare', 'SELECT * FROM leave_requests WHERE id = ?').get(id);
    
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

// Get department leave rules
router.get('/rules/:departmentId', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { departmentId } = req.params;
    
    const rules = dbCall(db, 'prepare', 'SELECT * FROM department_leave_rules WHERE department_id = ?').get(departmentId);
    
    if (!rules) {
      // Return default rules
      return res.json({
        department_id: departmentId,
        max_concurrent_leaves: 2,
        min_on_duty_staff: 3,
        require_critical_staff: 1,
        min_critical_staff: 1,
        min_advance_days: 3,
        max_consecutive_days: 14,
        min_leave_unit: 'DAY',
        blackout_dates: null,
        restricted_dates: null,
        priority_dates: null,
        critical_positions: null,
        leave_type_rules: null,
        auto_approve_no_conflict: 0,
        require_proxy: 0
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
    
    // Check permission
    if (currentUser.role !== 'SUPERVISOR' && currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // Supervisor can only update their own department
    if (currentUser.role === 'SUPERVISOR' && currentUser.department_id !== departmentId) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const {
      max_concurrent_leaves, min_on_duty_staff, require_critical_staff,
      min_critical_staff, min_advance_days, max_consecutive_days,
      min_leave_unit, blackout_dates, restricted_dates, priority_dates,
      critical_positions, leave_type_rules, auto_approve_no_conflict, require_proxy
    } = req.body;
    
    const now = new Date().toISOString();
    const id = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if rules exist
    const existingRules = dbCall(db, 'prepare', 'SELECT * FROM department_leave_rules WHERE department_id = ?').get(departmentId);
    
    if (existingRules) {
      // Update
      dbCall(db, 'prepare', `
        UPDATE department_leave_rules SET
          max_concurrent_leaves = ?, min_on_duty_staff = ?, require_critical_staff = ?,
          min_critical_staff = ?, min_advance_days = ?, max_consecutive_days = ?,
          min_leave_unit = ?, blackout_dates = ?, restricted_dates = ?, priority_dates = ?,
          critical_positions = ?, leave_type_rules = ?, auto_approve_no_conflict = ?,
          require_proxy = ?, updated_at = ?
        WHERE department_id = ?
      `).run(
        max_concurrent_leaves, min_on_duty_staff, require_critical_staff ? 1 : 0,
        min_critical_staff, min_advance_days, max_consecutive_days,
        min_leave_unit, blackout_dates, restricted_dates, priority_dates,
        critical_positions, leave_type_rules, auto_approve_no_conflict ? 1 : 0,
        require_proxy ? 1 : 0, now, departmentId
      );
    } else {
      // Insert
      dbCall(db, 'prepare', `
        INSERT INTO department_leave_rules (
          id, department_id, max_concurrent_leaves, min_on_duty_staff, require_critical_staff,
          min_critical_staff, min_advance_days, max_consecutive_days, min_leave_unit,
          blackout_dates, restricted_dates, priority_dates, critical_positions,
          leave_type_rules, auto_approve_no_conflict, require_proxy, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, departmentId, max_concurrent_leaves, min_on_duty_staff, require_critical_staff ? 1 : 0,
        min_critical_staff, min_advance_days, max_consecutive_days, min_leave_unit,
        blackout_dates, restricted_dates, priority_dates, critical_positions,
        leave_type_rules, auto_approve_no_conflict ? 1 : 0, require_proxy ? 1 : 0,
        currentUser.id, now, now
      );
    }
    
    const rules = dbCall(db, 'prepare', 'SELECT * FROM department_leave_rules WHERE department_id = ?').get(departmentId);
    
    res.json(rules);
  } catch (error) {
    console.error('Update rules error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user leave quotas
router.get('/quotas/:userId', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { userId } = req.params;
    const year = new Date().getFullYear();
    
    const quotas = dbCall(db, 'prepare', 'SELECT * FROM leave_quotas WHERE user_id = ? AND year = ?').all(userId, year);
    
    res.json(quotas);
  } catch (error) {
    console.error('Get quotas error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check leave conflict
router.post('/check-conflict', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { start_date, end_date, exclude_id } = req.body;
    
    const conflictCheck = await checkLeaveConflict(db, {
      user_id: currentUser.id,
      department_id: currentUser.department_id,
      start_date,
      end_date,
      exclude_id
    });
    
    res.json(conflictCheck);
  } catch (error) {
    console.error('Check conflict error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper functions
async function checkLeaveConflict(db, { user_id, department_id, start_date, end_date, exclude_id }) {
  const conflicts = [];
  
  // Get department rules
  const rules = dbCall(db, 'prepare', 'SELECT * FROM department_leave_rules WHERE department_id = ?').get(department_id);
  
  if (!rules) {
    return { hasConflict: false, conflicts: [] };
  }
  
  // Check concurrent leaves
  let query = `
    SELECT COUNT(*) as count FROM leave_requests
    WHERE department_id = ?
    AND status IN ('PENDING', 'APPROVED')
    AND (
      (start_date <= ? AND end_date >= ?)
      OR (start_date <= ? AND end_date >= ?)
      OR (start_date >= ? AND end_date <= ?)
    )
  `;
  
  const params = [department_id, start_date, start_date, end_date, end_date, start_date, end_date];
  
  if (exclude_id) {
    query += ' AND id != ?';
    params.push(exclude_id);
  }
  
  const concurrentCount = dbCall(db, 'prepare', query).get(...params).count;
  
  if (concurrentCount >= rules.max_concurrent_leaves) {
    conflicts.push({
      type: 'MAX_CONCURRENT',
      message: `Already ${concurrentCount} people on leave during this period (max: ${rules.max_concurrent_leaves})`
    });
  }
  
  // Check blackout dates
  if (rules.blackout_dates) {
    try {
      const blackoutDates = JSON.parse(rules.blackout_dates);
      // Simple check - can be enhanced
      if (blackoutDates && blackoutDates.length > 0) {
        conflicts.push({
          type: 'BLACKOUT_DATE',
          message: 'This period includes blackout dates'
        });
      }
    } catch (e) {}
  }
  
  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
}

function getSupervisor(db, department_id) {
  try {
    return dbCall(db, 'prepare', `
      SELECT * FROM users
      WHERE department_id = ? AND role = 'SUPERVISOR'
      LIMIT 1
    `).get(department_id);
  } catch (error) {
    return null;
  }
}

async function sendLeaveNotification(db, wsServer, { leave_request_id, user_id, type, message }) {
  try {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', `
      INSERT INTO leave_notifications (
        id, leave_request_id, user_id, type, message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, leave_request_id, user_id, type, message, now);
    
    // Send via WebSocket
    if (wsServer) {
      wsServer.broadcastToUser(user_id, 'LEAVE_NOTIFICATION', {
        id, leave_request_id, type, message, created_at: now
      });
    }
    
    // Send via chat system
    await sendChatNotification(db, wsServer, user_id, message);
  } catch (error) {
    console.error('Send notification error:', error);
  }
}

async function sendChatNotification(db, wsServer, user_id, message) {
  try {
    // Send message in system channel or create notification
    const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    // Find or create system notification channel
    // This integrates with the existing chat system
    dbCall(db, 'prepare', `
      INSERT INTO messages (
        id, channel_id, sender_id, content, type, created_at
      ) VALUES (?, 'system', 'system', ?, 'SYSTEM', ?)
    `).run(id, message, now);
    
    if (wsServer) {
      wsServer.broadcastToUser(user_id, 'NEW_MESSAGE', {
        id, content: message, type: 'SYSTEM', created_at: now
      });
    }
  } catch (error) {
    console.error('Send chat notification error:', error);
  }
}

function updateLeaveQuota(db, user_id, leave_type, days, action) {
  try {
    const year = new Date().getFullYear();
    const quota = dbCall(db, 'prepare', `
      SELECT * FROM leave_quotas
      WHERE user_id = ? AND leave_type = ? AND year = ?
    `).get(user_id, leave_type, year);
    
    if (quota) {
      const newUsedDays = action === 'use' ? quota.used_days + days : quota.used_days - days;
      const newRemainingDays = quota.total_days - newUsedDays;
      
      dbCall(db, 'prepare', `
        UPDATE leave_quotas SET
          used_days = ?, remaining_days = ?, updated_at = ?
        WHERE id = ?
      `).run(newUsedDays, newRemainingDays, new Date().toISOString(), quota.id);
    }
  } catch (error) {
    console.error('Update quota error:', error);
  }
}

async function integrateWithAttendance(db, leave) {
  try {
    // Mark attendance records for leave period
    // This integrates with the existing attendance system
    const startDate = new Date(leave.start_date);
    const endDate = new Date(leave.end_date);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      // Check if attendance record exists
      const existing = dbCall(db, 'prepare', `
        SELECT * FROM attendance
        WHERE user_id = ? AND date = ?
      `).get(leave.user_id, dateStr);
      
      if (!existing) {
        // Create attendance record marked as leave
        const id = `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        dbCall(db, 'prepare', `
          INSERT INTO attendance (
            id, user_id, date, status, leave_type, created_at
          ) VALUES (?, ?, ?, 'LEAVE', ?, ?)
        `).run(id, leave.user_id, dateStr, leave.leave_type, new Date().toISOString());
      }
    }
  } catch (error) {
    console.error('Integrate attendance error:', error);
  }
}

exports.leavesRoutes = router;
