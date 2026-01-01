import express from 'express';
import { SecureDatabase } from '../database-v2';
import { Task, TaskStatus, TaskUrgency, Role } from '../types';
import { logSystemAction } from '../utils/logger';
import { authenticateToken, requireRole, requireDepartmentAccess } from '../middleware/auth';

const router = express.Router();

// 任務狀態轉換規則
const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.OPEN]: [TaskStatus.ASSIGNED, TaskStatus.CANCELLED],
  [TaskStatus.ASSIGNED]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
  [TaskStatus.COMPLETED]: [], // 完成狀態不可更改
  [TaskStatus.CANCELLED]: [] // 取消狀態不可更改
};

// GET /api/tasks - 獲取任務列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db as SecureDatabase;
    const currentUser = req.user!;
    
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
    
    const params: any[] = [];

    // 權限過濾
    if (currentUser.role === Role.EMPLOYEE) {
      // 員工只能看到分配給自己或自己部門的任務
      query += ' AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ?)';
      params.push(currentUser.id, currentUser.department);
    } else if (currentUser.role === Role.SUPERVISOR) {
      // 主管可以看到自己部門的所有任務
      query += ' AND (t.target_department = ? OR t.created_by = ?)';
      params.push(currentUser.department, currentUser.id);
    }
    // BOSS 和 MANAGER 可以看到所有任務

    // 狀態過濾
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    // 緊急程度過濾
    if (urgency) {
      query += ' AND t.urgency = ?';
      params.push(urgency);
    }

    // 部門過濾
    if (department) {
      query += ' AND t.target_department = ?';
      params.push(department);
    }

    // 分配給特定用戶
    if (assigned_to) {
      query += ' AND t.assigned_to_user_id = ?';
      params.push(assigned_to);
    }

    // 創建者過濾
    if (created_by) {
      query += ' AND t.created_by = ?';
      params.push(created_by);
    }

    // 歸檔狀態
    query += ' AND t.is_archived = ?';
    params.push(is_archived === 'true' ? 1 : 0);

    // 排序和分頁
    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    const limitNum = parseInt(limit as string);
    const pageNum = parseInt(page as string);
    params.push(limitNum, (pageNum - 1) * limitNum);

    const tasks = await db.all(query, params);

    // 獲取總數
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
    const db = req.db as SecureDatabase;
    const currentUser = req.user!;
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

    // 權限檢查
    const canAccess = 
      currentUser.role === Role.BOSS ||
      currentUser.role === Role.MANAGER ||
      (currentUser.role === Role.SUPERVISOR && task.target_department === currentUser.department) ||
      task.assigned_to_user_id === currentUser.id ||
      task.created_by === currentUser.id;

    if (!canAccess) {
      return res.status(403).json({ error: '無權訪問此任務' });
    }

    // 獲取任務時間軸
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
    const db = req.db as SecureDatabase;
    const currentUser = req.user!;
    const { 
      title, 
      description, 
      urgency, 
      deadline, 
      target_department,
      assigned_to_user_id,
      assigned_to_department
    } = req.body;

    // 驗證必要欄位
    if (!title || !urgency) {
      return res.status(400).json({ 
        error: '請提供任務標題和緊急程度' 
      });
    }

    // 驗證緊急程度
    if (!Object.values(TaskUrgency).includes(urgency)) {
      return res.status(400).json({ error: '無效的緊急程度' });
    }

    // 權限檢查
    if (currentUser.role === Role.EMPLOYEE) {
      return res.status(403).json({ error: '員工無權創建任務' });
    }

    // 驗證部門權限
    if (target_department) {
      if (currentUser.role === Role.SUPERVISOR && target_department !== currentUser.department) {
        return res.status(403).json({ error: '主管只能為自己的部門創建任務' });
      }
    }

    // 驗證用戶分配
    if (assigned_to_user_id) {
      const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [assigned_to_user_id]);
      if (!targetUser) {
        return res.status(400).json({ error: '指定的用戶不存在' });
      }

      // 檢查分配權限
      if (currentUser.role === Role.SUPERVISOR) {
        if (targetUser.department !== currentUser.department) {
          return res.status(403).json({ error: '主管只能分配給自己部門的員工' });
        }
      }
    }

    // 驗證部門分配
    if (assigned_to_department) {
      const deptExists = await db.get('SELECT id FROM departments WHERE id = ?', [assigned_to_department]);
      if (!deptExists) {
        return res.status(400).json({ error: '指定的部門不存在' });
      }

      if (currentUser.role === Role.SUPERVISOR && assigned_to_department !== currentUser.department) {
        return res.status(403).json({ error: '主管只能分配給自己的部門' });
      }
    }

    // 生成任務 ID
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 創建任務
    await db.run(`
      INSERT INTO tasks (
        id, title, description, urgency, deadline, target_department,
        assigned_to_user_id, assigned_to_department, created_by,
        status, progress, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      taskId,
      title,
      description || '',
      urgency,
      deadline || null,
      target_department || null,
      assigned_to_user_id || null,
      assigned_to_department || null,
      currentUser.id,
      TaskStatus.OPEN,
      0,
      1
    ]);

    // 添加時間軸記錄
    await db.run(`
      INSERT INTO task_timeline (id, task_id, user_id, content, progress)
      VALUES (?, ?, ?, ?, ?)
    `, [
      `timeline-${Date.now()}`,
      taskId,
      currentUser.id,
      `任務創建：${title}`,
      0
    ]);

    // 記錄日誌
    await logSystemAction(db, currentUser, 'CREATE_TASK', `創建任務: ${title}`);

    // 如果是離線操作，添加到同步佇列
    if (req.body.is_offline) {
      await db.addToSyncQueue(
        currentUser.id,
        'create',
        'tasks',
        taskId,
        { title, description, urgency, deadline }
      );
    }

    // 獲取創建的任務
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

// PUT /api/tasks/:id - 更新任務
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db as SecureDatabase;
    const currentUser = req.user!;
    const { id } = req.params;
    const { 
      title, 
      description, 
      urgency, 
      deadline, 
      assigned_to_user_id,
      assigned_to_department,
      status,
      progress,
      is_offline
    } = req.body;

    // 獲取現有任務
    const existingTask = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
    if (!existingTask) {
      return res.status(404).json({ error: '任務不存在' });
    }

    // 權限檢查
    const canEdit = 
      currentUser.role === Role.BOSS ||
      currentUser.role === Role.MANAGER ||
      (currentUser.role === Role.SUPERVISOR && existingTask.target_department === currentUser.department) ||
      existingTask.created_by === currentUser.id;

    if (!canEdit) {
      return res.status(403).json({ error: '無權編輯此任務' });
    }

    // 檢查狀態轉換
    if (status && status !== existingTask.status) {
      const allowedTransitions = STATUS_TRANSITIONS[existingTask.status as TaskStatus];
      if (!allowedTransitions.includes(status as TaskStatus)) {
        return res.status(400).json({ 
          error: `無法從 ${existingTask.status} 狀態變更為 ${status}` 
        });
      }
    }

    // 構建更新語句
    const updates: string[] = [];
    const params: any[] = [];
    let timelineContent = '';

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
      timelineContent += `標題更改為: ${title}; `;
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (urgency !== undefined) {
      if (!Object.values(TaskUrgency).includes(urgency)) {
        return res.status(400).json({ error: '無效的緊急程度' });
      }
      updates.push('urgency = ?');
      params.push(urgency);
      timelineContent += `緊急程度更改為: ${urgency}; `;
    }

    if (deadline !== undefined) {
      updates.push('deadline = ?');
      params.push(deadline);
    }

    if (assigned_to_user_id !== undefined) {
      updates.push('assigned_to_user_id = ?');
      params.push(assigned_to_user_id);
      if (assigned_to_user_id !== existingTask.assigned_to_user_id) {
        timelineContent += `分配給用戶: ${assigned_to_user_id}; `;
      }
    }

    if (assigned_to_department !== undefined) {
      updates.push('assigned_to_department = ?');
      params.push(assigned_to_department);
      if (assigned_to_department !== existingTask.assigned_to_department) {
        timelineContent += `分配給部門: ${assigned_to_department}; `;
      }
    }

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
      timelineContent += `狀態更改為: ${status}; `;
    }

    if (progress !== undefined) {
      if (progress < 0 || progress > 100) {
        return res.status(400).json({ error: '進度必須在 0-100 之間' });
      }
      updates.push('progress = ?');
      params.push(progress);
      timelineContent += `進度更新為: ${progress}%; `;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '沒有需要更新的欄位' });
    }

    // 更新版本和同步時間
    updates.push('version = version + 1', 'last_synced_at = datetime(\'now\')');
    params.push(id);

    // 使用事務更新
    db.transaction(() => {
      db.run(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);
      
      // 添加時間軸記錄
      if (timelineContent) {
        db.run(`
          INSERT INTO task_timeline (id, task_id, user_id, content, progress, is_offline)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          `timeline-${Date.now()}`,
          id,
          currentUser.id,
          timelineContent.trim(),
          progress || existingTask.progress,
          is_offline ? 1 : 0
        ]);
      }
    })();

    // 記錄日誌
    await logSystemAction(db, currentUser, 'UPDATE_TASK', `更新任務: ${existingTask.title}`);

    // 離線同步處理
    if (is_offline) {
      await db.addToSyncQueue(
        currentUser.id,
        'update',
        'tasks',
        id,
        req.body
      );
    }

    // 獲取更新後的任務
    const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);

    res.json({
      task: updatedTask,
      message: '任務更新成功'
    });

  } catch (error) {
    console.error('更新任務錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /api/tasks/:id/accept - 接受任務
router.post('/:id/accept', authenticateToken, async (req, res) => {
  try {
    const db = req.db as SecureDatabase;
    const currentUser = req.user!;
    const { id } = req.params;

    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
    if (!task) {
      return res.status(404).json({ error: '任務不存在' });
    }

    // 檢查是否可以接受
    if (task.status !== TaskStatus.ASSIGNED && task.status !== TaskStatus.OPEN) {
      return res.status(400).json({ error: '此任務無法被接受' });
    }

    // 檢查權限
    const canAccept = 
      task.assigned_to_user_id === currentUser.id ||
      (task.assigned_to_department === currentUser.department && currentUser.role === Role.SUPERVISOR);

    if (!canAccept) {
      return res.status(403).json({ error: '無權接受此任務' });
    }

    // 更新任務
    await db.run(`
      UPDATE tasks 
      SET status = ?, accepted_by_user_id = ?, progress = 10, version = version + 1
      WHERE id = ?
    `, [TaskStatus.IN_PROGRESS, currentUser.id, id]);

    // 添加時間軸記錄
    await db.run(`
      INSERT INTO task_timeline (id, task_id, user_id, content, progress)
      VALUES (?, ?, ?, ?, ?)
    `, [
      `timeline-${Date.now()}`,
      id,
      currentUser.id,
      '任務已接受，開始執行',
      10
    ]);

    // 記錄日誌
    await logSystemAction(db, currentUser, 'ACCEPT_TASK', `接受任務: ${task.title}`);

    res.json({ message: '任務接受成功' });

  } catch (error) {
    console.error('接受任務錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /api/tasks/:id/complete - 完成任務
router.post('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const db = req.db as SecureDatabase;
    const currentUser = req.user!;
    const { id } = req.params;
    const { completion_notes } = req.body;

    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
    if (!task) {
      return res.status(404).json({ error: '任務不存在' });
    }

    // 檢查是否可以完成
    if (task.status !== TaskStatus.IN_PROGRESS) {
      return res.status(400).json({ error: '只有進行中的任務可以標記為完成' });
    }

    // 檢查權限
    const canComplete = 
      task.accepted_by_user_id === currentUser.id ||
      currentUser.role === Role.BOSS ||
      currentUser.role === Role.MANAGER ||
      (currentUser.role === Role.SUPERVISOR && task.target_department === currentUser.department);

    if (!canComplete) {
      return res.status(403).json({ error: '無權完成此任務' });
    }

    // 更新任務
    await db.run(`
      UPDATE tasks 
      SET status = ?, progress = 100, completion_notes = ?, version = version + 1
      WHERE id = ?
    `, [TaskStatus.COMPLETED, completion_notes || '', id]);

    // 添加時間軸記錄
    await db.run(`
      INSERT INTO task_timeline (id, task_id, user_id, content, progress)
      VALUES (?, ?, ?, ?, ?)
    `, [
      `timeline-${Date.now()}`,
      id,
      currentUser.id,
      `任務完成${completion_notes ? ': ' + completion_notes : ''}`,
      100
    ]);

    // 記錄日誌
    await logSystemAction(db, currentUser, 'COMPLETE_TASK', `完成任務: ${task.title}`);

    res.json({ message: '任務完成成功' });

  } catch (error) {
    console.error('完成任務錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /api/tasks/:id/timeline - 獲取任務時間軸
router.get('/:id/timeline', authenticateToken, async (req, res) => {
  try {
    const db = req.db as SecureDatabase;
    const currentUser = req.user!;
    const { id } = req.params;

    // 檢查任務訪問權限
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
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

    // 獲取時間軸
    const timeline = await db.all(`
      SELECT tl.*, u.name as user_name
      FROM task_timeline tl
      LEFT JOIN users u ON tl.user_id = u.id
      WHERE tl.task_id = ?
      ORDER BY tl.timestamp ASC
    `, [id]);

    res.json({ timeline });

  } catch (error) {
    console.error('獲取任務時間軸錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /api/tasks/sync/queue - 獲取用戶的同步佇列
router.get('/sync/queue', authenticateToken, async (req, res) => {
  try {
    const db = req.db as SecureDatabase;
    const currentUser = req.user!;

    const syncQueue = await db.getSyncQueue(currentUser.id);

    res.json({ syncQueue });

  } catch (error) {
    console.error('獲取同步佇列錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

export { router as taskRoutes };
