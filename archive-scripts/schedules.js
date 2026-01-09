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
        schedules = await db.all('SELECT * FROM schedules ORDER BY year DESC, month DESC, submitted_at DESC');
      } else if (currentUser.role === 'SUPERVISOR') {
        schedules = await db.all(
          'SELECT * FROM schedules WHERE department_id = ? ORDER BY year DESC, month DESC, submitted_at DESC',
          [currentUser.department]
        );
      } else {
        schedules = await db.all(
          'SELECT * FROM schedules WHERE user_id = ? ORDER BY year DESC, month DESC, submitted_at DESC',
          [currentUser.id]
        );
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

      const canApprove =
        currentUser.role === 'BOSS' ||
        currentUser.role === 'MANAGER' ||
        currentUser.role === 'SUPERVISOR';

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

      const canReject =
        currentUser.role === 'BOSS' ||
        currentUser.role === 'MANAGER' ||
        currentUser.role === 'SUPERVISOR';

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

      const canManage =
        currentUser.role === 'BOSS' ||
        currentUser.role === 'MANAGER' ||
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

  return router;
}

exports.schedulesRoutes = schedulesRoutes;
