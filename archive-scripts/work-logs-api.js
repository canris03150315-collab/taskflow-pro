const express = require('express');
const router = express.Router();

// GET / - Get work logs
router.get('/', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    
    let logs;
    if (currentUser.role === 'EMPLOYEE') {
      // Employees only see their own logs
      logs = await db.all('SELECT * FROM work_logs WHERE user_id = ? ORDER BY date DESC LIMIT 30', [currentUser.id]);
    } else if (currentUser.role === 'SUPERVISOR') {
      // Supervisors see their department's logs
      const deptUsers = await db.all('SELECT id FROM users WHERE department = ?', [currentUser.department]);
      const userIds = deptUsers.map(u => u.id);
      if (userIds.length > 0) {
        const placeholders = userIds.map(() => '?').join(',');
        logs = await db.all(`SELECT * FROM work_logs WHERE user_id IN (${placeholders}) ORDER BY date DESC LIMIT 100`, userIds);
      } else {
        logs = [];
      }
    } else {
      // BOSS and MANAGER see all logs
      logs = await db.all('SELECT * FROM work_logs ORDER BY date DESC LIMIT 100');
    }
    
    res.json(logs);
  } catch (error) {
    console.error('[Work Logs] Get error:', error);
    res.status(500).json({ error: 'Failed to get work logs' });
  }
});

// POST / - Create work log
router.post('/', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { date, todayTasks, tomorrowTasks, specialNotes } = req.body;
    
    if (!date || !todayTasks || !tomorrowTasks) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if log already exists for this date
    const existing = await db.get('SELECT * FROM work_logs WHERE user_id = ? AND date = ?', [currentUser.id, date]);
    
    if (existing) {
      return res.status(400).json({ error: 'Work log already exists for this date' });
    }
    
    const id = 'worklog-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    
    await db.run(
      'INSERT INTO work_logs (id, user_id, date, today_tasks, tomorrow_tasks, special_notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, currentUser.id, date, todayTasks, tomorrowTasks, specialNotes || '', now, now]
    );
    
    const log = await db.get('SELECT * FROM work_logs WHERE id = ?', [id]);
    res.json(log);
  } catch (error) {
    console.error('[Work Logs] Create error:', error);
    res.status(500).json({ error: 'Failed to create work log' });
  }
});

// PUT /:id - Update work log
router.put('/:id', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const { todayTasks, tomorrowTasks, specialNotes } = req.body;
    
    const log = await db.get('SELECT * FROM work_logs WHERE id = ?', [id]);
    
    if (!log) {
      return res.status(404).json({ error: 'Work log not found' });
    }
    
    // Only owner can edit
    if (log.user_id !== currentUser.id) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    const now = new Date().toISOString();
    
    await db.run(
      'UPDATE work_logs SET today_tasks = ?, tomorrow_tasks = ?, special_notes = ?, updated_at = ? WHERE id = ?',
      [todayTasks, tomorrowTasks, specialNotes || '', now, id]
    );
    
    const updated = await db.get('SELECT * FROM work_logs WHERE id = ?', [id]);
    res.json(updated);
  } catch (error) {
    console.error('[Work Logs] Update error:', error);
    res.status(500).json({ error: 'Failed to update work log' });
  }
});

// DELETE /:id - Delete work log
router.delete('/:id', async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    
    const log = await db.get('SELECT * FROM work_logs WHERE id = ?', [id]);
    
    if (!log) {
      return res.status(404).json({ error: 'Work log not found' });
    }
    
    // Only owner or BOSS/MANAGER can delete
    if (log.user_id !== currentUser.id && currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    await db.run('DELETE FROM work_logs WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('[Work Logs] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete work log' });
  }
});

module.exports = router;
