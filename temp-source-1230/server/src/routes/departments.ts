import express from 'express';
import { SecureDatabase } from '../database-v2';
import { logSystemAction } from '../utils/logger';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Role } from '../types';

const router = express.Router();

// GET /api/departments - 獲取所有部門
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db as SecureDatabase;
    const currentUser = req.user!;

    let query = `
      SELECT d.*, 
             COUNT(u.id) as member_count,
             GROUP_CONCAT(u.name) as members
      FROM departments d
      LEFT JOIN users u ON d.id = u.department
    `;
    
    const params: any[] = [];

    // 員工只能看到自己的部門
    if (currentUser.role === 'EMPLOYEE') {
      query += ' WHERE d.id = ?';
      params.push(currentUser.department);
    }

    query += ' GROUP BY d.id ORDER BY d.name ASC';

    const departments = await db.all(query, params);

    // 解析成員列表
    const departmentsWithMembers = departments.map(dept => ({
      ...dept,
      members: dept.members ? dept.members.split(',') : [],
      member_count: parseInt(dept.member_count)
    }));

    res.json(departmentsWithMembers);

  } catch (error) {
    console.error('獲取部門列表錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /api/departments/:id - 獲取特定部門
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db as SecureDatabase;
    const currentUser = req.user!;
    const { id } = req.params;

    // 權限檢查
    if (currentUser.role === 'EMPLOYEE' && currentUser.department !== id) {
      return res.status(403).json({ error: '無權訪問此部門' });
    }

    // 獲取部門資訊
    const department = await db.get('SELECT * FROM departments WHERE id = ?', [id]);
    if (!department) {
      return res.status(404).json({ error: '部門不存在' });
    }

    // 獲取部門成員
    const members = await db.all(
      'SELECT id, name, role, avatar, username, created_at FROM users WHERE department = ? ORDER BY role DESC, name ASC',
      [id]
    );

    // 獲取部門任務統計
    const taskStats = await db.get(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'Open' THEN 1 END) as open_tasks,
        COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_tasks
      FROM tasks 
      WHERE target_department = ? OR assigned_to_department = ?
    `, [id, id]);

    res.json({
      ...department,
      members,
      stats: taskStats
    });

  } catch (error) {
    console.error('獲取部門資訊錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// POST /api/departments - 創建新部門（需要管理員權限）
router.post('/', authenticateToken, requireRole([Role.BOSS, Role.MANAGER]), async (req, res) => {
  try {
    const db = req.db as SecureDatabase;
    const currentUser = req.user!;
    const { id, name, theme, icon } = req.body;

    // 驗證必要欄位
    if (!id || !name || !theme || !icon) {
      return res.status(400).json({ 
        error: '請提供完整的部門資訊（ID、名稱、主題、圖標）' 
      });
    }

    // 驗證主題
    const validThemes = ['slate', 'blue', 'purple', 'rose', 'emerald', 'orange', 'cyan'];
    if (!validThemes.includes(theme)) {
      return res.status(400).json({ error: '無效的主題' });
    }

    // 檢查部門 ID 是否已存在
    const existingDept = await db.get('SELECT id FROM departments WHERE id = ?', [id]);
    if (existingDept) {
      return res.status(400).json({ error: '部門 ID 已存在' });
    }

    // 創建部門
    await db.run(
      'INSERT INTO departments (id, name, theme, icon) VALUES (?, ?, ?, ?)',
      [id, name, theme, icon]
    );

    // 記錄日誌
    await logSystemAction(db, currentUser, 'CREATE_DEPARTMENT', `創建部門: ${name} (${id})`);

    // 獲取創建的部門
    const createdDepartment = await db.get('SELECT * FROM departments WHERE id = ?', [id]);

    res.status(201).json({
      department: createdDepartment,
      message: '部門創建成功'
    });

  } catch (error) {
    console.error('創建部門錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// PUT /api/departments/:id - 更新部門資訊
router.put('/:id', authenticateToken, requireRole([Role.BOSS, Role.MANAGER]), async (req, res) => {
  try {
    const db = req.db as SecureDatabase;
    const currentUser = req.user!;
    const { id } = req.params;
    const { name, theme, icon } = req.body;

    // 獲取現有部門
    const existingDept = await db.get('SELECT * FROM departments WHERE id = ?', [id]);
    if (!existingDept) {
      return res.status(404).json({ error: '部門不存在' });
    }

    // 驗證主題
    if (theme) {
      const validThemes = ['slate', 'blue', 'purple', 'rose', 'emerald', 'orange', 'cyan'];
      if (!validThemes.includes(theme)) {
        return res.status(400).json({ error: '無效的主題' });
      }
    }

    // 構建更新語句
    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }

    if (theme !== undefined) {
      updates.push('theme = ?');
      params.push(theme);
    }

    if (icon !== undefined) {
      updates.push('icon = ?');
      params.push(icon);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '沒有需要更新的欄位' });
    }

    params.push(id);

    // 更新部門
    await db.run(`UPDATE departments SET ${updates.join(', ')} WHERE id = ?`, params);

    // 記錄日誌
    await logSystemAction(db, currentUser, 'UPDATE_DEPARTMENT', `更新部門: ${existingDept.name} (${id})`);

    // 獲取更新後的部門
    const updatedDepartment = await db.get('SELECT * FROM departments WHERE id = ?', [id]);

    res.json({
      department: updatedDepartment,
      message: '部門更新成功'
    });

  } catch (error) {
    console.error('更新部門錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// DELETE /api/departments/:id - 刪除部門（需要 BOSS 權限）
router.delete('/:id', authenticateToken, requireRole([Role.BOSS]), async (req, res) => {
  try {
    const db = req.db as SecureDatabase;
    const currentUser = req.user!;
    const { id } = req.params;

    // 獲取要刪除的部門
    const departmentToDelete = await db.get('SELECT * FROM departments WHERE id = ?', [id]);
    if (!departmentToDelete) {
      return res.status(404).json({ error: '部門不存在' });
    }

    // 檢查是否有用戶
    const userCount = await db.get('SELECT COUNT(*) as count FROM users WHERE department = ?', [id]);
    if (userCount.count > 0) {
      return res.status(400).json({ 
        error: '該部門還有用戶，無法刪除。請先移除或重新分配用戶。' 
      });
    }

    // 檢查是否有相關任務
    const taskCount = await db.get(
      'SELECT COUNT(*) as count FROM tasks WHERE target_department = ? OR assigned_to_department = ?',
      [id, id]
    );

    if (taskCount.count > 0) {
      return res.status(400).json({ 
        error: '該部門還有相關任務，無法刪除。請先處理相關任務。' 
      });
    }

    // 刪除部門
    await db.run('DELETE FROM departments WHERE id = ?', [id]);

    // 記錄日誌
    await logSystemAction(db, currentUser, 'DELETE_DEPARTMENT', `刪除部門: ${departmentToDelete.name} (${id})`);

    res.json({ message: '部門刪除成功' });

  } catch (error) {
    console.error('刪除部門錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /api/departments/:id/tasks - 獲取部門任務
router.get('/:id/tasks', authenticateToken, async (req, res) => {
  try {
    const db = req.db as SecureDatabase;
    const currentUser = req.user!;
    const { id } = req.params;

    // 權限檢查
    if (currentUser.role === 'EMPLOYEE' && currentUser.department !== id) {
      return res.status(403).json({ error: '無權訪問此部門任務' });
    }

    const { status, urgency, page = '1', limit = '50' } = req.query;

    let query = `
      SELECT t.*, 
             u.name as assigned_user_name,
             creator.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to_user_id = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE (t.target_department = ? OR t.assigned_to_department = ?)
    `;
    
    const params: any[] = [id, id];

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
    console.error('獲取部門任務錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

// GET /api/departments/:id/members - 獲取部門成員
router.get('/:id/members', authenticateToken, async (req, res) => {
  try {
    const db = req.db as SecureDatabase;
    const currentUser = req.user!;
    const { id } = req.params;

    // 權限檢查
    if (currentUser.role === 'EMPLOYEE' && currentUser.department !== id) {
      return res.status(403).json({ error: '無權訪問此部門成員' });
    }

    const members = await db.all(`
      SELECT u.*, 
             COUNT(t.id) as task_count,
             COUNT(CASE WHEN t.status = 'In Progress' THEN 1 END) as active_tasks
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assigned_to_user_id
      WHERE u.department = ?
      GROUP BY u.id
      ORDER BY u.role DESC, u.name ASC
    `, [id]);

    res.json({ members });

  } catch (error) {
    console.error('獲取部門成員錯誤:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

export { router as departmentRoutes };
