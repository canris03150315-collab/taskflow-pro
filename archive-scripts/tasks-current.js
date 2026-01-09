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
        
        res.json({ success: true, message: '\u4efb\u52d9\u5df2\u522a\u9664' });
    } catch (error) {
        console.error('\u522a\u9664\u4efb\u52d9\u932f\u8aa4:', error);
        res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
    }
});

exports.taskRoutes = router;
// 隞餃????????const STATUS_TRANSITIONS = {
    ["Open"]: ["Assigned", "Cancelled"],
    ["Assigned"]: ["In Progress", "Cancelled"],
    ["In Progress"]: ["Completed", "Cancelled"],
    ["Completed"]: [], // 摰?????舀??    ["Cancelled"]: [] // ??????舀??};
// GET /api/tasks - ?脣?隞餃??”
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
        // 甈??蕪
        if (currentUser.role === types_1.Role.EMPLOYEE) {
            // ?∪極?臭誑?嚗?.??蝯西撌梁? 2.??蝯西撌梢???3.?祇?隞餃?
            query += ' AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ? OR (t.assigned_to_user_id IS NULL AND t.assigned_to_department IS NULL))';
            params.push(currentUser.id, currentUser.department);
        }
        else if (currentUser.role === types_1.Role.SUPERVISOR) {
            // 銝餌恣?臭誑?嚗?.?芸楛?券??遙??2.?芸楛?萄遣??3.?祇?隞餃?
            query += ' AND (t.target_department = ? OR t.created_by = ? OR (t.assigned_to_user_id IS NULL AND t.assigned_to_department IS NULL AND t.target_department IS NULL))';
            params.push(currentUser.department, currentUser.id);
        }
        // BOSS ??MANAGER ?臭誑???遙??        // ???瞈?        if (status) {
            query += ' AND t.status = ?';
            params.push(status);
        }
        // 蝺亦?摨阡?瞈?        if (urgency) {
            query += ' AND t.urgency = ?';
            params.push(urgency);
        }
        // ?券??蕪
        if (department) {
            query += ' AND t.target_department = ?';
            params.push(department);
        }
        // ??蝯衣摰??        if (assigned_to) {
            query += ' AND t.assigned_to_user_id = ?';
            params.push(assigned_to);
        }
        // ?萄遣??瞈?        if (created_by) {
            query += ' AND t.created_by = ?';
            params.push(created_by);
        }
        // 甇豢????        query += ' AND t.is_archived = ?';
        params.push(is_archived === 'true' ? 1 : 0);
        // ??????        query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
        const limitNum = parseInt(limit);
        const pageNum = parseInt(page);
        params.push(limitNum, (pageNum - 1) * limitNum);
        const tasks = await db.all(query, params);
        
        // ?脣?瘥遙?? timeline
        for (const task of tasks) {
            const timeline = await db.all('SELECT * FROM task_timeline WHERE task_id = ? ORDER BY timestamp ASC', [task.id]);
            task.timeline = timeline;
        }
        
        // ?脣?蝮賣
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
        console.error('?脣?隞餃??”?航炊:', error);
        res.status(500).json({ error: '隡箸??典?券隤? });
    }
});
// GET /api/tasks/:id - ?脣??孵?隞餃?
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
            return res.status(404).json({ error: '隞餃?銝??? });
        }
        // 甈?瑼Ｘ
        const canAccess = currentUser.role === types_1.Role.BOSS ||
            currentUser.role === types_1.Role.MANAGER ||
            (currentUser.role === types_1.Role.SUPERVISOR && task.target_department === currentUser.department) ||
            task.assigned_to_user_id === currentUser.id ||
            task.created_by === currentUser.id ||
            task.accepted_by_user_id === currentUser.id;
        if (!canAccess) {
            return res.status(403).json({ error: '?⊥?閮芸?甇支遙?? });
        }
        // ?脣?隞餃???頠?        const timeline = await db.all('SELECT * FROM task_timeline WHERE task_id = ? ORDER BY timestamp ASC', [id]);
        res.json({
            ...task,
            timeline
        });
    }
    catch (error) {
        console.error('?脣?隞餃??航炊:', error);
        res.status(500).json({ error: '隡箸??典?券隤? });
    }
});
// POST /api/tasks - ?萄遣隞餃?
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { title, description, urgency, deadline, target_department, assigned_to_user_id, assigned_to_department } = req.body;
        // 撽?敹?甈?
        if (!title || !urgency) {
            return res.status(400).json({
                error: '隢?靘遙??憿?蝺亦?摨?
            });
        }
        // 撽?蝺亦?摨?        if (!Object.values(types_1.TaskUrgency).includes(urgency)) {
            return res.status(400).json({ error: '?⊥????亦?摨? });
        }
        // 甈?瑼Ｘ
        if (currentUser.role === types_1.Role.EMPLOYEE) {
            return res.status(403).json({ error: '?∪極?⊥??萄遣隞餃?' });
        }
        // 撽??券?甈?
        if (target_department) {
            if (currentUser.role === types_1.Role.SUPERVISOR && target_department !== currentUser.department) {
                return res.status(403).json({ error: '銝餌恣?芾?箄撌梁??券??萄遣隞餃?' });
            }
        }
        // 撽??冽??
        if (assigned_to_user_id) {
            const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [assigned_to_user_id]);
            if (!targetUser) {
                return res.status(400).json({ error: '????嗡?摮' });
            }
            // 瑼Ｘ??甈?
            if (currentUser.role === types_1.Role.SUPERVISOR) {
                if (targetUser.department !== currentUser.department) {
                    return res.status(403).json({ error: '銝餌恣?芾??蝯西撌梢??撌? });
                }
            }
        }
        // 撽??券???
        if (assigned_to_department) {
            const deptExists = await db.get('SELECT id FROM departments WHERE id = ?', [assigned_to_department]);
            if (!deptExists) {
                return res.status(400).json({ error: '????銝??? });
            }
            if (currentUser.role === types_1.Role.SUPERVISOR && assigned_to_department !== currentUser.department) {
                return res.status(403).json({ error: '銝餌恣?芾??蝯西撌梁??券?' });
            }
        }
        // ??隞餃? ID
        const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // ?萄遣隞餃?
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
            "Open",
            0,
            1
        ]);
        // 瘛餃???頠貉???        await db.run(`
      INSERT INTO task_timeline (id, task_id, user_id, content, progress)
      VALUES (?, ?, ?, ?, ?)
    `, [
            `timeline-${Date.now()}`,
            taskId,
            currentUser.id,
            `隞餃??萄遣嚗?{title}`,
            0
        ]);
        // 閮??亥?
        await (0, logger_1.logSystemAction)(db, currentUser, 'CREATE_TASK', `?萄遣隞餃?: ${title}`);
        // 憒??舫蝺?雿?瘛餃??啣?甇乩???        if (req.body.is_offline) {
            await db.addToSyncQueue(currentUser.id, 'create', 'tasks', taskId, { title, description, urgency, deadline });
        }
        // ?脣??萄遣?遙??        const createdTask = await db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
        res.status(201).json({
            task: createdTask,
            message: '隞餃??萄遣??'
        });
    }
    catch (error) {
        console.error('?萄遣隞餃??航炊:', error);
        res.status(500).json({ error: '隡箸??典?券隤? });
    }
});
// PUT /api/tasks/:id - ?湔隞餃?
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        const { title, description, urgency, deadline, assigned_to_user_id, assigned_to_department, status, progress, is_offline, note, is_archived } = req.body;
        // ?脣??暹?隞餃?
        const existingTask = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
        if (!existingTask) {
            return res.status(404).json({ error: '隞餃?銝??? });
        }
        // 甈?瑼Ｘ
        const canEdit = currentUser.role === types_1.Role.BOSS ||
            currentUser.role === types_1.Role.MANAGER ||
            (currentUser.role === types_1.Role.SUPERVISOR && existingTask.target_department === currentUser.department) ||
            existingTask.created_by === currentUser.id ||
            existingTask.accepted_by_user_id === currentUser.id;
        if (!canEdit) {
            return res.status(403).json({ error: '?⊥?蝺刻摩甇支遙?? });
        }
        // 瑼Ｘ?????        if (status && status !== existingTask.status) {
            const allowedTransitions = STATUS_TRANSITIONS[existingTask.status];
            if (!allowedTransitions.includes(status)) {
                return res.status(400).json({
                    error: `?⊥?敺?${existingTask.status} ????渡 ${status}`
                });
            }
        }
        // 瑽遣?湔隤
        const updates = [];
        const params = [];
        let timelineContent = '';
        if (title !== undefined) {
            updates.push('title = ?');
            params.push(title);
            timelineContent += `璅??湔?? ${title}; `;
        }
        if (description !== undefined) {
            updates.push('description = ?');
            params.push(description);
        }
        if (urgency !== undefined) {
            if (!Object.values(types_1.TaskUrgency).includes(urgency)) {
                return res.status(400).json({ error: '?⊥????亦?摨? });
            }
            updates.push('urgency = ?');
            params.push(urgency);
            timelineContent += `蝺亦?摨行?寧: ${urgency}; `;
        }
        if (deadline !== undefined) {
            updates.push('deadline = ?');
            params.push(deadline);
        }
        if (assigned_to_user_id !== undefined) {
            updates.push('assigned_to_user_id = ?');
            params.push(assigned_to_user_id);
            if (assigned_to_user_id !== existingTask.assigned_to_user_id) {
                timelineContent += `??蝯衣?? ${assigned_to_user_id}; `;
            }
        }
        if (assigned_to_department !== undefined) {
            updates.push('assigned_to_department = ?');
            params.push(assigned_to_department);
            if (assigned_to_department !== existingTask.assigned_to_department) {
                timelineContent += `??蝯阡?: ${assigned_to_department}; `;
            }
        }
        if (status !== undefined) {
            updates.push('status = ?');
            params.push(status);
            timelineContent += `???寧: ${status}; `;
        }
        // ?酉??
        if (note) {
            timelineContent += note + '; ';
        }
                if (is_archived !== undefined) {
            updates.push('is_archived = ?');
            params.push(is_archived ? 1 : 0);
        }
                if (progress !== undefined) {
            if (progress < 0 || progress > 100) {
                return res.status(400).json({ error: '?脣漲敹???0-100 銋?' });
            }
            updates.push('progress = ?');
            params.push(progress);
            timelineContent += `?脣漲?湔?? ${progress}%; `;
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: '瘝??閬?啁?甈?' });
        }
        // ?湔???甇交???        updates.push('version = version + 1', 'last_synced_at = datetime(\'now\')');
        params.push(id);
        // 雿輻鈭??湔
        // Update task
            await db.run(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);
            // 瘛餃???頠貉???            if (timelineContent) {
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
        // 閮??亥?
        await (0, logger_1.logSystemAction)(db, currentUser, 'UPDATE_TASK', `?湔隞餃?: ${existingTask.title}`);
        // ?Ｙ??郊??
        if (is_offline) {
            await db.addToSyncQueue(currentUser.id, 'update', 'tasks', id, req.body);
        }
        // ?脣??湔敺?隞餃?
        const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
        res.json({
            task: updatedTask,
            message: '隞餃??湔??'
        });
    }
    catch (error) {
        console.error('?湔隞餃??航炊:', error);
        res.status(500).json({ error: '隡箸??典?券隤? });
    }
});
// POST /api/tasks/:id/accept - ?亙?隞餃?
router.post('/:id/accept', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
        if (!task) {
            return res.status(404).json({ error: '隞餃?銝??? });
        }
        // 瑼Ｘ?臬?臭誑?亙?
        if (task.status !== "Assigned" && task.status !== "Open") {
            return res.status(400).json({ error: '甇支遙?瘜◤?亙?' });
        }
        // 瑼Ｘ甈?
        const canAccept = task.assigned_to_user_id === currentUser.id ||
            (task.assigned_to_department === currentUser.department && currentUser.role === types_1.Role.SUPERVISOR) ||
            (task.assigned_to_user_id === null && task.assigned_to_department === null);
        if (!canAccept) {
            return res.status(403).json({ error: '?⊥??亙?甇支遙?? });
        }
        // ?湔隞餃?
        await db.run(`
      UPDATE tasks 
      SET status = ?, accepted_by_user_id = ?, progress = 10, version = version + 1
      WHERE id = ?
    `, ["In Progress", currentUser.id, id]);
        // 瘛餃???頠貉???        await db.run(`
      INSERT INTO task_timeline (id, task_id, user_id, content, progress)
      VALUES (?, ?, ?, ?, ?)
    `, [
            `timeline-${Date.now()}`,
            id,
            currentUser.id,
            '隞餃?撌脫?????瑁?',
            10
        ]);
        // 閮??亥?
        await (0, logger_1.logSystemAction)(db, currentUser, 'ACCEPT_TASK', `?亙?隞餃?: ${task.title}`);
        // ?脣??湔敺?隞餃??豢?
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
        
        // ?脣???頠?        const timeline = await db.all('SELECT * FROM task_timeline WHERE task_id = ? ORDER BY timestamp DESC', [id]);
        updatedTask.timeline = timeline;
        
        res.json({ message: '隞餃??亙???', task: updatedTask });
    }
    catch (error) {
        console.error('?亙?隞餃??航炊:', error);
        res.status(500).json({ error: '隡箸??典?券隤? });
    }
});
// POST /api/tasks/:id/complete - 摰?隞餃?
router.post('/:id/complete', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        const { completion_notes } = req.body;
        const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
        if (!task) {
            return res.status(404).json({ error: '隞餃?銝??? });
        }
        // 瑼Ｘ?臬?臭誑摰?
        if (task.status !== "In Progress") {
            return res.status(400).json({ error: '?芣??脰?銝剔?隞餃??臭誑璅??箏??? });
        }
        // 瑼Ｘ甈?
        const canComplete = task.accepted_by_user_id === currentUser.id ||
            currentUser.role === types_1.Role.BOSS ||
            currentUser.role === types_1.Role.MANAGER ||
            (currentUser.role === types_1.Role.SUPERVISOR && task.target_department === currentUser.department);
        if (!canComplete) {
            return res.status(403).json({ error: '?⊥?摰?甇支遙?? });
        }
        // ?湔隞餃?
        await db.run(`
      UPDATE tasks 
      SET status = ?, progress = 100, completion_notes = ?, version = version + 1
      WHERE id = ?
    `, ["Completed", completion_notes || '', id]);
        // 瘛餃???頠貉???        await db.run(`
      INSERT INTO task_timeline (id, task_id, user_id, content, progress)
      VALUES (?, ?, ?, ?, ?)
    `, [
            `timeline-${Date.now()}`,
            id,
            currentUser.id,
            `隞餃?摰?${completion_notes ? ': ' + completion_notes : ''}`,
            100
        ]);
        // 閮??亥?
        await (0, logger_1.logSystemAction)(db, currentUser, 'COMPLETE_TASK', `摰?隞餃?: ${task.title}`);
        res.json({ message: '隞餃?摰???' });
    }
    catch (error) {
        console.error('摰?隞餃??航炊:', error);
        res.status(500).json({ error: '隡箸??典?券隤? });
    }
});
// GET /api/tasks/:id/timeline - ?脣?隞餃???頠?router.get('/:id/timeline', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        // 瑼Ｘ隞餃?閮芸?甈?
        const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
        if (!task) {
            return res.status(404).json({ error: '隞餃?銝??? });
        }
        const canAccess = currentUser.role === types_1.Role.BOSS ||
            currentUser.role === types_1.Role.MANAGER ||
            (currentUser.role === types_1.Role.SUPERVISOR && task.target_department === currentUser.department) ||
            task.assigned_to_user_id === currentUser.id ||
            task.created_by === currentUser.id;
        if (!canAccess) {
            return res.status(403).json({ error: '?⊥?閮芸?甇支遙?? });
        }
        // ?脣???頠?        const timeline = await db.all(`
      SELECT tl.*, u.name as user_name
      FROM task_timeline tl
      LEFT JOIN users u ON tl.user_id = u.id
      WHERE tl.task_id = ?
      ORDER BY tl.timestamp ASC
    `, [id]);
        res.json({ timeline });
    }
    catch (error) {
        console.error('?脣?隞餃???頠賊隤?', error);
        res.status(500).json({ error: '隡箸??典?券隤? });
    }
});
// GET /api/tasks/sync/queue - ?脣??冽??甇乩???router.get('/sync/queue', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const syncQueue = await db.getSyncQueue(currentUser.id);
        res.json({ syncQueue });
    }
    catch (error) {
        console.error('?脣??郊雿??航炊:', error);
        res.status(500).json({ error: '隡箸??典?券隤? });
    }
});
//# sourceMappingURL=tasks.js.map
