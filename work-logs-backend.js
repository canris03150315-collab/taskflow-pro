// work-logs.js - Work Log Routes (Pure ASCII)
// Purpose: Manage daily work logs with department and user filtering

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Helper function for database calls
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

// GET /api/work-logs - Get work logs with filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { departmentId, userId, date, startDate, endDate } = req.query;

    let query = `
      SELECT 
        wl.*,
        u.name as user_name,
        d.name as department_name
      FROM work_logs wl
      LEFT JOIN users u ON wl.user_id = u.id
      LEFT JOIN departments d ON wl.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    // Permission-based filtering
    if (currentUser.role === 'BOSS' || currentUser.role === 'MANAGER') {
      // Can view all departments
      if (departmentId && departmentId !== 'ALL') {
        query += ' AND wl.department_id = ?';
        params.push(departmentId);
      }
    } else if (currentUser.role === 'SUPERVISOR') {
      // Can only view own department
      query += ' AND wl.department_id = ?';
      params.push(currentUser.department);
    } else {
      // Regular employees can only view their own logs
      query += ' AND wl.user_id = ?';
      params.push(currentUser.id);
    }

    // User filter
    if (userId && userId !== 'ALL') {
      query += ' AND wl.user_id = ?';
      params.push(userId);
    }

    // Date filters
    if (date) {
      query += ' AND wl.date = ?';
      params.push(date);
    } else if (startDate && endDate) {
      query += ' AND wl.date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY wl.date DESC, wl.created_at DESC';

    const logs = await dbCall(db, 'all', query, params);

    // Map to camelCase
    const mappedLogs = logs.map(log => ({
      id: log.id,
      userId: log.user_id,
      userName: log.user_name,
      departmentId: log.department_id,
      departmentName: log.department_name,
      date: log.date,
      todayTasks: log.today_tasks,
      tomorrowTasks: log.tomorrow_tasks,
      notes: log.notes || '',
      createdAt: log.created_at,
      updatedAt: log.updated_at
    }));

    res.json({ logs: mappedLogs });
  } catch (error) {
    console.error('Error fetching work logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/work-logs - Create new work log
router.post('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { date, todayTasks, tomorrowTasks, notes } = req.body;

    // Validation
    if (!date || !todayTasks || !tomorrowTasks) {
      return res.status(400).json({ error: 'Date, today tasks, and tomorrow tasks are required' });
    }

    // Check if log already exists for this user and date
    const existing = await dbCall(db, 'get', 
      'SELECT id FROM work_logs WHERE user_id = ? AND date = ?',
      [currentUser.id, date]
    );

    if (existing) {
      return res.status(400).json({ error: 'Work log already exists for this date' });
    }

    const id = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await dbCall(db, 'run', `
      INSERT INTO work_logs (
        id, user_id, department_id, date, 
        today_tasks, tomorrow_tasks, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      currentUser.id,
      currentUser.department,
      date,
      todayTasks,
      tomorrowTasks,
      notes || '',
      now,
      now
    ]);

    // Get the created log with user and department names
    const log = await dbCall(db, 'get', `
      SELECT 
        wl.*,
        u.name as user_name,
        d.name as department_name
      FROM work_logs wl
      LEFT JOIN users u ON wl.user_id = u.id
      LEFT JOIN departments d ON wl.department_id = d.id
      WHERE wl.id = ?
    `, [id]);

    const mappedLog = {
      id: log.id,
      userId: log.user_id,
      userName: log.user_name,
      departmentId: log.department_id,
      departmentName: log.department_name,
      date: log.date,
      todayTasks: log.today_tasks,
      tomorrowTasks: log.tomorrow_tasks,
      notes: log.notes || '',
      createdAt: log.created_at,
      updatedAt: log.updated_at
    };

    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('work_log_created', mappedLog);
    }

    res.json({ success: true, log: mappedLog });
  } catch (error) {
    console.error('Error creating work log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/work-logs/:id - Update work log
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const { todayTasks, tomorrowTasks, notes } = req.body;

    // Check if log exists and belongs to current user
    const existing = await dbCall(db, 'get',
      'SELECT * FROM work_logs WHERE id = ?',
      [id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Work log not found' });
    }

    if (existing.user_id !== currentUser.id) {
      return res.status(403).json({ error: 'You can only edit your own work logs' });
    }

    const now = new Date().toISOString();
    const updates = [];
    const params = [];

    if (todayTasks !== undefined) {
      updates.push('today_tasks = ?');
      params.push(todayTasks);
    }
    if (tomorrowTasks !== undefined) {
      updates.push('tomorrow_tasks = ?');
      params.push(tomorrowTasks);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    await dbCall(db, 'run',
      `UPDATE work_logs SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Get updated log
    const log = await dbCall(db, 'get', `
      SELECT 
        wl.*,
        u.name as user_name,
        d.name as department_name
      FROM work_logs wl
      LEFT JOIN users u ON wl.user_id = u.id
      LEFT JOIN departments d ON wl.department_id = d.id
      WHERE wl.id = ?
    `, [id]);

    const mappedLog = {
      id: log.id,
      userId: log.user_id,
      userName: log.user_name,
      departmentId: log.department_id,
      departmentName: log.department_name,
      date: log.date,
      todayTasks: log.today_tasks,
      tomorrowTasks: log.tomorrow_tasks,
      notes: log.notes || '',
      createdAt: log.created_at,
      updatedAt: log.updated_at
    };

    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('work_log_updated', mappedLog);
    }

    res.json({ success: true, log: mappedLog });
  } catch (error) {
    console.error('Error updating work log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/work-logs/:id - Delete work log
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;

    // Check if log exists and belongs to current user
    const existing = await dbCall(db, 'get',
      'SELECT * FROM work_logs WHERE id = ?',
      [id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Work log not found' });
    }

    if (existing.user_id !== currentUser.id) {
      return res.status(403).json({ error: 'You can only delete your own work logs' });
    }

    await dbCall(db, 'run', 'DELETE FROM work_logs WHERE id = ?', [id]);

    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('work_log_deleted', { id });
    }

    res.json({ success: true, message: 'Work log deleted successfully' });
  } catch (error) {
    console.error('Error deleting work log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
