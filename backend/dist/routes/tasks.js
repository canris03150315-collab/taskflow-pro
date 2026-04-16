"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskRoutes = void 0;
const express_1 = __importDefault(require("express"));
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// DELETE /:id - \u522a\u9664\u4efb\u52d9
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        const db = req.db;
        
        // \u7372\u53d6\u4efb\u52d9
        const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
        
        if (!task) {
            return res.status(404).json({ error: '\u4efb\u52d9\u4e0d\u5b58\u5728' });
        }
        
        // \u6b0a\u9650\u6aa2\u67e5: BOSS \u53ef\u4ee5\u522a\u9664\u4efb\u4f55\u4efb\u52d9\uff0c\u5176\u4ed6\u4eba\u53ea\u80fd\u522a\u9664\u81ea\u5df1\u5275\u5efa\u7684
        if (currentUser.role !== 'BOSS' && task.created_by !== currentUser.id) {
            return res.status(403).json({ error: '\u7121\u6b0a\u522a\u9664\u6b64\u4efb\u52d9' });
        }
        
        // \u522a\u9664\u4efb\u52d9
        await db.run('DELETE FROM tasks WHERE id = ?', [id]);
        
        // \u8a18\u9304\u65e5\u8a8c
        try {
            await db.logAction(currentUser.id, currentUser.name, 'DELETE_TASK', `\u522a\u9664\u4efb\u52d9: ${task.title}`, 'INFO');
        } catch (error) {
            console.error('\u8a18\u9304\u65e5\u8a8c\u5931\u6557:', error);
        }
        
        
        // Broadcast WebSocket event
        if (req.wsServer) {
            req.wsServer.broadcastToAll('TASK_DELETED', {
                taskId: id,
                timestamp: new Date().toISOString()
            });
        }
        res.json({ success: true, message: '\u4efb\u52d9\u5df2\u522a\u9664' });
    } catch (error) {
        console.error('\u522a\u9664\u4efb\u52d9\u932f\u8aa4:', error);
        res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
    }
});

// 任務狀態轉換規則
const STATUS_TRANSITIONS = {
    ["待接取"]: ["已指派", "已取消"],
    ["已指派"]: ["進行中", "已取消"],
    ["進行中"]: ["已完成", "已取消"],
    ["已完成"]: [], // 完成狀態不可更改
    ["已取消"]: [] // 取消狀態不可更改
};
// GET /api/tasks - 獲取任務列表
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { status, urgency, department, assigned_to, created_by, is_archived = 'false', page = '1', limit = '50' } = req.query;
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
        // 權限過濾
        if (currentUser.role === types_1.Role.EMPLOYEE) {
            // 員工可以看到：1.分配給自己的 2.分配給自己部門的 3.公開任務
            query += ' AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ? OR (t.assigned_to_user_id IS NULL AND t.assigned_to_department IS NULL))';
            params.push(currentUser.id, currentUser.department);
        }
        else if (currentUser.role === types_1.Role.SUPERVISOR) {
            // 主管可以看到：1.自己部門的任務 2.自己創建的 3.公開任務
            query += ' AND (t.target_department = ? OR t.created_by = ? OR (t.assigned_to_user_id IS NULL AND t.assigned_to_department IS NULL AND t.target_department IS NULL))';
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
        const limitNum = parseInt(limit);
        const pageNum = parseInt(page);
        params.push(limitNum, (pageNum - 1) * limitNum);
        const tasks = await db.all(query, params);
        
        // 獲取每個任務的 timeline
        for (const task of tasks) {
            const timeline = await db.all('SELECT * FROM task_timeline WHERE task_id = ? ORDER BY timestamp ASC', [task.id]);
            task.timeline = timeline;
        }
        
        // 獲取總數
        const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM').replace(/ORDER BY[\s\S]*$/, '');
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
    }
    catch (error) {
        console.error('獲取任務列表錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
// GET /api/tasks/:id - 獲取特定任務
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
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
        // 權限檢查
        const canAccess = currentUser.role === types_1.Role.BOSS ||
            currentUser.role === types_1.Role.MANAGER ||
            (currentUser.role === types_1.Role.SUPERVISOR && task.target_department === currentUser.department) ||
            task.assigned_to_user_id === currentUser.id ||
            task.created_by === currentUser.id ||
            task.accepted_by_user_id === currentUser.id;
        if (!canAccess) {
            return res.status(403).json({ error: '無權訪問此任務' });
        }
        // 獲取任務時間軸
        const timeline = await db.all('SELECT * FROM task_timeline WHERE task_id = ? ORDER BY timestamp ASC', [id]);
        res.json({
            ...task,
            timeline
        });
    }
    catch (error) {
        console.error('獲取任務錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
// POST /api/tasks - 創建任務
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { title, description, urgency, deadline, target_department, assigned_to_user_id, assigned_to_department } = req.body;
        // 驗證必要欄位
        if (!title || !urgency) {
            return res.status(400).json({
                error: '請提供任務標題和緊急程度'
            });
        }
        // E1/E4 fix: Title must be non-empty (not just whitespace) and max 200 chars
        if (!title.trim()) {
            return res.status(400).json({ error: '任務標題不可為空白' });
        }
        if (title.length > 200) {
            return res.status(400).json({ error: '任務標題不可超過 200 字元' });
        }
        // 驗證緊急程度 - 使用明確的值列表避免 enum import 問題
        const VALID_URGENCY_VALUES = ['low', 'medium', 'high', 'urgent'];
        if (!VALID_URGENCY_VALUES.includes(urgency)) {
            console.error('[Task Create] Invalid urgency value received:', JSON.stringify(urgency), 'type:', typeof urgency, 'body:', JSON.stringify(req.body));
            return res.status(400).json({ error: `無效的緊急程度: ${urgency}` });
        }
        // 權限檢查
        if (currentUser.role === types_1.Role.EMPLOYEE) {
            return res.status(403).json({ error: '員工無權創建任務' });
        }
        // 驗證部門權限
        if (target_department) {
            if (currentUser.role === types_1.Role.SUPERVISOR && target_department !== currentUser.department) {
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
            if (currentUser.role === types_1.Role.SUPERVISOR) {
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
            if (currentUser.role === types_1.Role.SUPERVISOR && assigned_to_department !== currentUser.department) {
                return res.status(403).json({ error: '主管只能分配給自己的部門' });
            }
        }
        // B13 fix: Prevent duplicate task creation (same title by same user within 30 seconds)
        // Use SQLite datetime() to compare consistently regardless of stored format
        const duplicateTask = await db.get(
            "SELECT id FROM tasks WHERE title = ? AND created_by = ? AND datetime(created_at) >= datetime('now', '-30 seconds')",
            [title, currentUser.id]
        );
        if (duplicateTask) {
            return res.status(409).json({ error: '請勿重複建立相同任務' });
        }

        // 生成任務 ID
        const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // 創建任務
        await db.run(`
      INSERT INTO tasks (
          id, title, description, urgency, deadline, target_department,
          assigned_to_user_id, assigned_to_department, created_by,
          status, progress, version, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
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
            "待接取",
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
        await (0, logger_1.logSystemAction)(db, currentUser, 'CREATE_TASK', `創建任務: ${title}`);
        // 如果是離線操作，添加到同步佇列
        if (req.body.is_offline) {
            await db.addToSyncQueue(currentUser.id, 'create', 'tasks', taskId, { title, description, urgency, deadline });
        }
        // 獲取創建的任務
        const createdTask = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
        res.status(201).json({
            task: createdTask,
            message: '任務創建成功'
        });
    }
    catch (error) {
        console.error('創建任務錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
// PUT /api/tasks/:id - 更新任務
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        const { title, description, urgency, deadline, assigned_to_user_id, assigned_to_department, status, progress, is_offline, note, is_archived } = req.body;
        // 獲取現有任務
        const existingTask = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
        if (!existingTask) {
            return res.status(404).json({ error: '任務不存在' });
        }
        // 權限檢查
        const canEdit = currentUser.role === types_1.Role.BOSS ||
            currentUser.role === types_1.Role.MANAGER ||
            (currentUser.role === types_1.Role.SUPERVISOR && existingTask.target_department === currentUser.department) ||
            existingTask.created_by === currentUser.id ||
            existingTask.accepted_by_user_id === currentUser.id;
        if (!canEdit) {
            return res.status(403).json({ error: '無權編輯此任務' });
        }
        // 檢查狀態轉換
        if (status && status !== existingTask.status) {
            const allowedTransitions = STATUS_TRANSITIONS[existingTask.status];
            if (!allowedTransitions.includes(status)) {
                return res.status(400).json({
                    error: `無法從 ${existingTask.status} 狀態變更為 ${status}`
                });
            }
        }
        // 構建更新語句
        const updates = [];
        const params = [];
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
            const VALID_URGENCY_VALUES = ['low', 'medium', 'high', 'urgent'];
            if (!VALID_URGENCY_VALUES.includes(urgency)) {
                console.error('[Task Update] Invalid urgency value received:', JSON.stringify(urgency), 'type:', typeof urgency);
                return res.status(400).json({ error: `無效的緊急程度: ${urgency}` });
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
        // 備註處理
        if (note) {
            timelineContent += note + '; ';
        }
                if (is_archived !== undefined) {
            updates.push('is_archived = ?');
            params.push(is_archived ? 1 : 0);
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
        // Update task
            await db.run(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);
            // 添加時間軸記錄
            if (timelineContent) {
                await db.run(`
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
        // 記錄日誌
        await (0, logger_1.logSystemAction)(db, currentUser, 'UPDATE_TASK', `更新任務: ${existingTask.title}`);
        // 離線同步處理
        if (is_offline) {
            await db.addToSyncQueue(currentUser.id, 'update', 'tasks', id, req.body);
        }
        // 獲取更新後的任務
        const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
        res.json({
            task: updatedTask,
            message: '任務更新成功'
        });
    }
    catch (error) {
        console.error('更新任務錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
// POST /api/tasks/:id/accept - 接受任務
router.post('/:id/accept', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
        if (!task) {
            return res.status(404).json({ error: '任務不存在' });
        }
        // 檢查是否可以接受
        if (task.status !== "已指派" && task.status !== "待接取") {
            return res.status(400).json({ error: '此任務無法被接受' });
        }
        // 檢查權限
        const canAccept = task.assigned_to_user_id === currentUser.id ||
            (task.assigned_to_department === currentUser.department && currentUser.role === types_1.Role.SUPERVISOR) ||
            (task.assigned_to_user_id === null && task.assigned_to_department === null);
        if (!canAccept) {
            return res.status(403).json({ error: '無權接受此任務' });
        }
        // 更新任務
        await db.run(`
      UPDATE tasks 
      SET status = ?, accepted_by_user_id = ?, progress = 10, version = version + 1
      WHERE id = ?
    `, ["進行中", currentUser.id, id]);
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
        await (0, logger_1.logSystemAction)(db, currentUser, 'ACCEPT_TASK', `接受任務: ${task.title}`);
        // 獲取更新後的任務數據
        const updatedTask = await db.get(`
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
        
        // 獲取時間軸
        const timeline = await db.all('SELECT * FROM task_timeline WHERE task_id = ? ORDER BY timestamp DESC', [id]);
        updatedTask.timeline = timeline;
        
        res.json({ message: '任務接受成功', task: updatedTask });
    }
    catch (error) {
        console.error('接受任務錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
// POST /api/tasks/:id/complete - 完成任務
router.post('/:id/complete', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        const { completion_notes } = req.body;
        const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
        if (!task) {
            return res.status(404).json({ error: '任務不存在' });
        }
        // 檢查是否可以完成
        if (task.status !== "進行中") {
            return res.status(400).json({ error: '只有進行中的任務可以標記為完成' });
        }
        // 檢查權限
        const canComplete = task.accepted_by_user_id === currentUser.id ||
            currentUser.role === types_1.Role.BOSS ||
            currentUser.role === types_1.Role.MANAGER ||
            (currentUser.role === types_1.Role.SUPERVISOR && task.target_department === currentUser.department);
        if (!canComplete) {
            return res.status(403).json({ error: '無權完成此任務' });
        }
        // 更新任務
        await db.run(`
      UPDATE tasks 
      SET status = ?, progress = 100, completion_notes = ?, version = version + 1
      WHERE id = ?
    `, ["已完成", completion_notes || '', id]);
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
        await (0, logger_1.logSystemAction)(db, currentUser, 'COMPLETE_TASK', `完成任務: ${task.title}`);
        res.json({ message: '任務完成成功' });
    }
    catch (error) {
        console.error('完成任務錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
// GET /api/tasks/:id/timeline - 獲取任務時間軸
router.get('/:id/timeline', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        // 檢查任務訪問權限
        const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
        if (!task) {
            return res.status(404).json({ error: '任務不存在' });
        }
        const canAccess = currentUser.role === types_1.Role.BOSS ||
            currentUser.role === types_1.Role.MANAGER ||
            (currentUser.role === types_1.Role.SUPERVISOR && task.target_department === currentUser.department) ||
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
    }
    catch (error) {
        console.error('獲取任務時間軸錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
// GET /api/tasks/sync/queue - 獲取用戶的同步佇列
router.get('/sync/queue', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const syncQueue = await db.getSyncQueue(currentUser.id);
        res.json({ syncQueue });
    }
    catch (error) {
        console.error('獲取同步佇列錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
//# sourceMappingURL=tasks.js.map

exports.taskRoutes = router;
