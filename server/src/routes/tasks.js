"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskRoutes = void 0;

const express = require("express");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// 任務狀態轉換規則
const TaskStatus = {
  OPEN: 'OPEN',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

const TaskUrgency = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

const Role = {
  BOSS: 'BOSS',
  MANAGER: 'MANAGER',
  SUPERVISOR: 'SUPERVISOR',
  EMPLOYEE: 'EMPLOYEE'
};

const STATUS_TRANSITIONS = {
  [TaskStatus.OPEN]: [TaskStatus.ASSIGNED, TaskStatus.CANCELLED],
  [TaskStatus.ASSIGNED]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
  [TaskStatus.COMPLETED]: [],
  [TaskStatus.CANCELLED]: []
};

// GET /api/tasks - 獲取任務列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    
    const { 
      status, 
      urgency, 
      department, 
      assigned_to, 
      created_by,
      is_archived = 'false',
      page = '1',
      limit = '50'
    } = req.query;

    let query = `
      SELECT t.*, 
             u.name as assigned_user_name,
             creator.name as created_by_name,
             dept.name as department_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to_user_id = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      LEFT JOIN departments dept ON t.target_department = dept.id
      WHERE 1=1
    `;
    
    const params = [];

    // 權限過濾 (修復: 包含公開任務和自己創建的任務)
    if (currentUser.role === Role.EMPLOYEE) {
      query += ' AND ((t.assigned_to_user_id IS NULL AND t.assigned_to_department IS NULL) OR t.assigned_to_user_id = ? OR t.assigned_to_department = ? OR t.created_by = ?)';
      params.push(currentUser.id, currentUser.department, currentUser.id);
    } else if (currentUser.role === Role.SUPERVISOR) {
      query += ' AND ((t.assigned_to_user_id IS NULL AND t.assigned_to_department IS NULL) OR t.target_department = ? OR t.assigned_to_department = ? OR t.created_by = ?)';
      params.push(currentUser.department, currentUser.department, currentUser.id);
    }

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    if (urgency) {
      query += ' AND t.urgency = ?';
      params.push(urgency);
    }

    if (department) {
      query += ' AND t.target_department = ?';
      params.push(department);
    }

    if (assigned_to) {
      query += ' AND t.assigned_to_user_id = ?';
      params.push(assigned_to);
    }

    if (created_by) {
      query += ' AND t.created_by = ?';
      params.push(created_by);
    }

    query += ' AND t.is_archived = ?';
    params.push(is_archived === 'true' ? 1 : 0);

    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    params.push(limitNum, (pageNum - 1) * limitNum);

    const tasks = await db.all(query, params);

    const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM').replace(/ORDER BY.*$/, '');
    const countResult = await db.get(countQuery, params.slice(0, -2));

    res.json({
      tasks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limitNum)
      }
    });

  } catch (error) {
    console.error('獲取任務列表錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /api/tasks/:id - 獲取特定任務
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;

    const task = await db.get(`
      SELECT t.*, 
             u.name as assigned_user_name,
             creator.name as created_by_name,
             dept.name as department_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to_user_id = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      LEFT JOIN departments dept ON t.target_department = dept.id
      WHERE t.id = ?
    `, [id]);

    if (!task) {
      return res.status(404).json({ error: '任務不存在' });
    }

    const canAccess = 
      currentUser.role === Role.BOSS ||
      currentUser.role === Role.MANAGER ||
      (currentUser.role === Role.SUPERVISOR && task.target_department === currentUser.department) ||
      task.assigned_to_user_id === currentUser.id ||
      task.created_by === currentUser.id;

    if (!canAccess) {
      return res.status(403).json({ error: '無權訪問此任務' });
    }

    const timeline = await db.all(
      'SELECT * FROM task_timeline WHERE task_id = ? ORDER BY timestamp ASC',
      [id]
    );

    res.json({
      ...task,
      timeline
    });

  } catch (error) {
    console.error('獲取任務錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /api/tasks - 創建任務
router.post('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { 
      title, 
      description, 
      urgency, 
      deadline, 
      target_department,
      assigned_to_user_id,
      assigned_to_department
    } = req.body;

    if (!title || !urgency) {
      return res.status(400).json({ error: '請提供任務標題和緊急程度' });
    }

    if (currentUser.role === Role.EMPLOYEE) {
      return res.status(403).json({ error: '員工無權創建任務' });
    }

    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await db.run(`
      INSERT INTO tasks (
        id, title, description, urgency, deadline, target_department,
        assigned_to_user_id, assigned_to_department, created_by,
        status, progress, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      taskId, title, description || '', urgency, deadline || null, target_department || null,
      assigned_to_user_id || null, assigned_to_department || null, currentUser.id,
      TaskStatus.OPEN, 0, 1
    ]);

    await db.run(`
      INSERT INTO task_timeline (id, task_id, user_id, content, progress)
      VALUES (?, ?, ?, ?, ?)
    `, [`timeline-${Date.now()}`, taskId, currentUser.id, `任務創建：${title}`, 0]);

    const createdTask = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);

    res.status(201).json({
      task: createdTask,
      message: '任務創建成功'
    });

  } catch (error) {
    console.error('創建任務錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /api/tasks/:id/accept - 接受任務
router.post('/:id/accept', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;

    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
    if (!task) {
      return res.status(404).json({ error: '任務不存在' });
    }

    if (task.status !== TaskStatus.ASSIGNED && task.status !== TaskStatus.OPEN) {
      return res.status(400).json({ error: '此任務無法被接受' });
    }

    // 修復: 允許員工接取部門任務
    const canAccept = 
      task.assigned_to_user_id === currentUser.id ||
      task.assigned_to_department === currentUser.department ||
      (task.status === TaskStatus.OPEN && !task.assigned_to_user_id && !task.assigned_to_department);

    if (!canAccept) {
      return res.status(403).json({ error: '無權接受此任務' });
    }

    await db.run(`
      UPDATE tasks 
      SET status = ?, accepted_by_user_id = ?, progress = 10, version = version + 1
      WHERE id = ?
    `, [TaskStatus.IN_PROGRESS, currentUser.id, id]);

    await db.run(`
      INSERT INTO task_timeline (id, task_id, user_id, content, progress)
      VALUES (?, ?, ?, ?, ?)
    `, [`timeline-${Date.now()}`, id, currentUser.id, '任務已接受，開始執行', 10]);

    res.json({ message: '任務接受成功' });

  } catch (error) {
    console.error('接受任務錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

exports.taskRoutes = router;
