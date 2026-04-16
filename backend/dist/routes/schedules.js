const express = require('express');
const router = express.Router();

function schedulesRoutes(db, wsServer) {
  const { authenticateToken } = require('../middleware/auth');

  // Get all schedules (filtered by role)
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const currentUser = req.user;
      let schedules;

      if (currentUser.role === 'BOSS' || currentUser.role === 'MANAGER') {
        schedules = await db.all('SELECT * FROM schedules ORDER BY year DESC, month DESC, submitted_at DESC') || [];
      } else if (currentUser.role === 'SUPERVISOR') {
        // Check if SUPERVISOR has cross-department permission
        const userPerms = currentUser.permissions ? (typeof currentUser.permissions === 'string' ? JSON.parse(currentUser.permissions) : currentUser.permissions) : [];
        const hasApproveLeaves = userPerms.includes('APPROVE_LEAVES');

        if (hasApproveLeaves) {
          schedules = await db.all('SELECT * FROM schedules ORDER BY year DESC, month DESC, submitted_at DESC') || [];
        } else {
          schedules = await db.all(
            'SELECT * FROM schedules WHERE department_id = ? ORDER BY year DESC, month DESC, submitted_at DESC',
            [currentUser.department]
          ) || [];
        }
      } else {
        // EMPLOYEE can see their own + all APPROVED in department
        schedules = await db.all(
          "SELECT * FROM schedules WHERE user_id = ? OR (department_id = ? AND status = 'APPROVED') ORDER BY year DESC, month DESC, submitted_at DESC",
          [currentUser.id, currentUser.department]
        ) || [];
      }

      res.json(schedules);
    } catch (error) {
      console.error('Get schedules error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Submit schedule
  router.post('/', authenticateToken, async (req, res) => {
    try {
      const currentUser = req.user;
      const { year, month, selectedDays } = req.body;

      if (!year || !month || !selectedDays || !Array.isArray(selectedDays)) {
        return res.status(400).json({ error: 'Invalid input' });
      }

      const id = `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      const selectedDaysStr = JSON.stringify(selectedDays);
      const totalDays = selectedDays.length;

      await db.run(
        `INSERT INTO schedules (
          id, user_id, department_id, year, month, selected_days, total_days,
          status, submitted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
        [id, currentUser.id, currentUser.department, year, month, selectedDaysStr, totalDays, now, now, now]
      );

      const schedule = await db.get('SELECT * FROM schedules WHERE id = ?', [id]);

      if (wsServer) {
        wsServer.broadcast('SCHEDULE_CREATED', schedule);
      }

      res.json({ success: true, schedule });
    } catch (error) {
      console.error('Submit schedule error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Approve schedule
  router.post('/:id/approve', authenticateToken, async (req, res) => {
    try {
      const currentUser = req.user;
      const { id } = req.params;
      const { review_notes } = req.body;

      // Check permission including APPROVE_LEAVES
      const userPermsApprove = currentUser.permissions ? (typeof currentUser.permissions === 'string' ? JSON.parse(currentUser.permissions) : currentUser.permissions) : [];
      const hasApproveLeaves = userPermsApprove.includes('APPROVE_LEAVES');
      
      const canApprove =
        currentUser.role === 'BOSS' ||
        currentUser.role === 'MANAGER' ||
        currentUser.role === 'SUPERVISOR' ||
        hasApproveLeaves;

      if (!canApprove) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const schedule = await db.get('SELECT * FROM schedules WHERE id = ?', [id]);
      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      const now = new Date().toISOString();

      await db.run(
        `UPDATE schedules SET
          status = 'APPROVED',
          reviewed_by = ?,
          reviewed_at = ?,
          review_notes = ?,
          updated_at = ?
        WHERE id = ?`,
        [currentUser.id, now, review_notes || '', now, id]
      );

      const updatedSchedule = await db.get('SELECT * FROM schedules WHERE id = ?', [id]);

      if (wsServer) {
        wsServer.broadcast('SCHEDULE_UPDATED', updatedSchedule);
      }

      res.json({ success: true, schedule: updatedSchedule });
    } catch (error) {
      console.error('Approve schedule error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Reject schedule
  router.post('/:id/reject', authenticateToken, async (req, res) => {
    try {
      const currentUser = req.user;
      const { id } = req.params;
      const { review_notes } = req.body;

      // Check permission including APPROVE_LEAVES
      const userPermsReject = currentUser.permissions ? (typeof currentUser.permissions === 'string' ? JSON.parse(currentUser.permissions) : currentUser.permissions) : [];
      const hasApproveLeavesReject = userPermsReject.includes('APPROVE_LEAVES');
      
      const canReject =
        currentUser.role === 'BOSS' ||
        currentUser.role === 'MANAGER' ||
        currentUser.role === 'SUPERVISOR' ||
        hasApproveLeavesReject;

      if (!canReject) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const schedule = await db.get('SELECT * FROM schedules WHERE id = ?', [id]);
      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      const now = new Date().toISOString();

      await db.run(
        `UPDATE schedules SET
          status = 'REJECTED',
          reviewed_by = ?,
          reviewed_at = ?,
          review_notes = ?,
          updated_at = ?
        WHERE id = ?`,
        [currentUser.id, now, review_notes || '', now, id]
      );

      const updatedSchedule = await db.get('SELECT * FROM schedules WHERE id = ?', [id]);

      if (wsServer) {
        wsServer.broadcast('SCHEDULE_UPDATED', updatedSchedule);
      }

      res.json({ success: true, schedule: updatedSchedule });
    } catch (error) {
      console.error('Reject schedule error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get department rules
  
  // Update schedule (for supervisor adjustment)
  router.put('/:id', authenticateToken, async (req, res) => {
    try {
      const currentUser = req.user;
      const { id } = req.params;
      const { selectedDays } = req.body;

      // Check permission including APPROVE_LEAVES
      const userPermsUpdate = currentUser.permissions ? (typeof currentUser.permissions === 'string' ? JSON.parse(currentUser.permissions) : currentUser.permissions) : [];
      const hasApproveLeavesUpdate = userPermsUpdate.includes('APPROVE_LEAVES');
      
      const canManage = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER' || currentUser.role === 'SUPERVISOR' || hasApproveLeavesUpdate;
      if (!canManage) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const schedule = await db.get('SELECT * FROM schedules WHERE id = ?', [id]);
      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      const now = new Date().toISOString();
      const selectedDaysStr = JSON.stringify(selectedDays);
      const totalDays = selectedDays.length;

      // Re-check conflicts
      const deptSchedules = await db.all(
        'SELECT * FROM schedules WHERE department_id = ? AND year = ? AND month = ? AND id != ? AND status = ?',
        [schedule.department_id, schedule.year, schedule.month, id, 'APPROVED']
      );

      const deptUsers = await db.all('SELECT * FROM users WHERE department = ?', [schedule.department_id]);
      const conflicts = [];
      const daysInMonth = new Date(schedule.year, schedule.month, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        let offCount = 0;
        for (const s of deptSchedules) {
          const offDays = JSON.parse(s.selected_days || '[]');
          if (offDays.includes(day)) offCount++;
        }
        if (selectedDays.includes(day)) offCount++;

        const totalStaff = deptUsers.length;
        const onDutyCount = totalStaff - offCount;
        const rules = await db.get('SELECT * FROM schedule_rules WHERE department_id = ?', [schedule.department_id]);
        const minOnDuty = rules ? rules.min_on_duty_staff : 3;

        if (onDutyCount < minOnDuty) {
          conflicts.push({ day, onDuty: onDutyCount, required: minOnDuty });
        }
      }

      const hasConflict = conflicts.length > 0 ? 1 : 0;
      const conflictDetails = conflicts.length > 0 ? JSON.stringify(conflicts) : null;

      await db.run(
        'UPDATE schedules SET selected_days = ?, total_days = ?, has_conflict = ?, conflict_details = ?, updated_at = ? WHERE id = ?',
        [selectedDaysStr, totalDays, hasConflict, conflictDetails, now, id]
      );

      const updatedSchedule = await db.get('SELECT * FROM schedules WHERE id = ?', [id]);
      if (wsServer) wsServer.broadcast('SCHEDULE_UPDATED', updatedSchedule);
      res.json({ success: true, schedule: updatedSchedule });
    } catch (error) {
      console.error('Update schedule error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
router.get('/rules/:departmentId', authenticateToken, async (req, res) => {
    try {
      const { departmentId } = req.params;
      
      let rules = await db.get(
        'SELECT * FROM schedule_rules WHERE department_id = ?',
        [departmentId]
      );

      if (!rules) {
        const id = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        
        await db.run(
          `INSERT INTO schedule_rules (
            id, department_id, max_days_per_month, submission_deadline, min_on_duty_staff,
            created_at, updated_at
          ) VALUES (?, ?, 8, 25, 3, ?, ?)`,
          [id, departmentId, now, now]
        );

        rules = await db.get('SELECT * FROM schedule_rules WHERE id = ?', [id]);
      }

      res.json(rules);
    } catch (error) {
      console.error('Get rules error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update department rules
  router.put('/rules/:departmentId', authenticateToken, async (req, res) => {
    try {
      const currentUser = req.user;
      const { departmentId } = req.params;
      const { max_days_per_month, submission_deadline, min_on_duty_staff } = req.body;

      // Check permission including MANAGE_LEAVE_RULES
      const userPermsRules = currentUser.permissions ? (typeof currentUser.permissions === 'string' ? JSON.parse(currentUser.permissions) : currentUser.permissions) : [];
      const hasManageLeaveRules = userPermsRules.includes('MANAGE_LEAVE_RULES');
      
      const canManage =
        currentUser.role === 'BOSS' ||
        currentUser.role === 'MANAGER' ||
        hasManageLeaveRules ||
        (currentUser.role === 'SUPERVISOR' && currentUser.department === departmentId);

      if (!canManage) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const now = new Date().toISOString();

      let rules = await db.get(
        'SELECT * FROM schedule_rules WHERE department_id = ?',
        [departmentId]
      );

      if (rules) {
        await db.run(
          `UPDATE schedule_rules SET
            max_days_per_month = ?,
            submission_deadline = ?,
            min_on_duty_staff = ?,
            updated_at = ?
          WHERE department_id = ?`,
          [max_days_per_month, submission_deadline, min_on_duty_staff, now, departmentId]
        );
      } else {
        const id = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        await db.run(
          `INSERT INTO schedule_rules (
            id, department_id, max_days_per_month, submission_deadline, min_on_duty_staff,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, departmentId, max_days_per_month, submission_deadline, min_on_duty_staff, now, now]
        );
      }

      rules = await db.get('SELECT * FROM schedule_rules WHERE department_id = ?', [departmentId]);

      res.json({ success: true, rules });
    } catch (error) {
      console.error('Update rules error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });


  // DELETE /:id - 軟刪除排班
  router.delete('/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = req.user;
      
      // 1. 查詢排班記錄
      const schedule = await db.get('SELECT * FROM schedules WHERE id = ?', [id]);
      
      if (!schedule) {
        return res.status(404).json({ error: '排班不存在' });
      }
      
      // 2. 權限檢查
      const canDelete = 
        schedule.user_id === currentUser.id || 
        currentUser.role === 'BOSS' || 
        (currentUser.role === 'SUPERVISOR' && schedule.department_id === currentUser.department) ||
        (currentUser.role === 'MANAGER' && schedule.department_id === currentUser.department);
      
      if (!canDelete) {
        return res.status(403).json({ error: '無權刪除此排班' });
      }
      
      // 3. 狀態檢查
      if (schedule.status !== 'APPROVED') {
        return res.status(400).json({ error: '只能刪除已批准的排班' });
      }
      
      // 4. 時間檢查
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const scheduleMonth = new Date(schedule.year, schedule.month - 1, 1);
      
      if (scheduleMonth < currentMonth) {
        return res.status(400).json({ error: '無法刪除過去的排班' });
      }
      
      // 5. 軟刪除
      const now_iso = new Date().toISOString();
      await db.run('UPDATE schedules SET status = ?, updated_at = ? WHERE id = ?', ['CANCELLED', now_iso, id]);
      
      // 6. 記錄日誌
      if (db.logAction) {
        db.logAction(currentUser.id, currentUser.name, 'DELETE_SCHEDULE', 
          `刪除排班: ${schedule.year}年${schedule.month}月`, 'INFO');
      }
      
      console.log(`Schedule deleted: ${id} by ${currentUser.name}`);
      res.json({ success: true, message: '排班已刪除' });
    } catch (error) {
      console.error('Delete schedule error:', error);
      res.status(500).json({ error: error.message || '刪除失敗' });
    }
  });

  return router;
}

exports.schedulesRoutes = schedulesRoutes;


