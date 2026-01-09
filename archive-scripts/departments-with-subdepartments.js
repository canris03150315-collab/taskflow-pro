"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.departmentRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
exports.departmentRoutes = router;

// GET /api/departments - \u7372\u53d6\u6240\u6709\u90e8\u9580\uff08\u5305\u542b\u5b50\u90e8\u9580\u95dc\u4fc2\uff09
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const departments = await db.all('SELECT * FROM departments ORDER BY name ASC');
        
        // \u5efa\u7acb\u968e\u5c64\u7d50\u69cb
        const departmentMap = {};
        const rootDepartments = [];
        
        // \u7b2c\u4e00\u6b21\u904d\u6b77\uff1a\u5efa\u7acb map
        departments.forEach(dept => {
            departmentMap[dept.id] = { ...dept, subdepartments: [] };
        });
        
        // \u7b2c\u4e8c\u6b21\u904d\u6b77\uff1a\u5efa\u7acb\u968e\u5c64
        departments.forEach(dept => {
            if (dept.parent_department_id && departmentMap[dept.parent_department_id]) {
                departmentMap[dept.parent_department_id].subdepartments.push(departmentMap[dept.id]);
            } else {
                rootDepartments.push(departmentMap[dept.id]);
            }
        });
        
        res.json({ departments: rootDepartments });
    }
    catch (error) {
        console.error('\u7372\u53d6\u90e8\u9580\u932f\u8aa4:', error);
        res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
    }
});

// GET /api/departments/flat - \u7372\u53d6\u6240\u6709\u90e8\u9580\uff08\u5e73\u5766\u5217\u8868\uff09
router.get('/flat', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const departments = await db.all('SELECT * FROM departments ORDER BY name ASC');
        res.json({ departments });
    }
    catch (error) {
        console.error('\u7372\u53d6\u90e8\u9580\u932f\u8aa4:', error);
        res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
    }
});

// GET /api/departments/:id - \u7372\u53d6\u55ae\u500b\u90e8\u9580\u8a73\u60c5
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const { id } = req.params;
        const department = await db.get('SELECT * FROM departments WHERE id = ?', [id]);
        if (!department) {
            return res.status(404).json({ error: '\u90e8\u9580\u4e0d\u5b58\u5728' });
        }
        
        // \u7372\u53d6\u5b50\u90e8\u9580
        const subdepartments = await db.all('SELECT * FROM departments WHERE parent_department_id = ? ORDER BY name ASC', [id]);
        department.subdepartments = subdepartments;
        
        // \u7372\u53d6\u7236\u90e8\u9580\u8cc7\u8a0a
        if (department.parent_department_id) {
            const parentDept = await db.get('SELECT id, name FROM departments WHERE id = ?', [department.parent_department_id]);
            department.parent_department = parentDept;
        }
        
        res.json({ department });
    }
    catch (error) {
        console.error('\u7372\u53d6\u90e8\u9580\u932f\u8aa4:', error);
        res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
    }
});

// POST /api/departments - \u5275\u5efa\u65b0\u90e8\u9580
router.post('/', auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.Role.BOSS, types_1.Role.MANAGER]), async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { name, theme, icon, parent_department_id } = req.body;
        
        if (!name || !theme || !icon) {
            return res.status(400).json({ error: '\u8acb\u63d0\u4f9b\u90e8\u9580\u540d\u7a31\u3001\u4e3b\u984c\u548c\u5716\u793a' });
        }
        
        // \u9a57\u8b49\u7236\u90e8\u9580\u662f\u5426\u5b58\u5728
        if (parent_department_id) {
            const parentDept = await db.get('SELECT * FROM departments WHERE id = ?', [parent_department_id]);
            if (!parentDept) {
                return res.status(400).json({ error: '\u7236\u90e8\u9580\u4e0d\u5b58\u5728' });
            }
        }
        
        const validThemes = ['slate', 'blue', 'purple', 'rose', 'emerald', 'orange', 'cyan'];
        if (!validThemes.includes(theme)) {
            return res.status(400).json({ error: '\u7121\u6548\u7684\u4e3b\u984c' });
        }
        
        const id = Math.random().toString(36).substring(2, 11);
        
        await db.run('INSERT INTO departments (id, name, theme, icon, parent_department_id) VALUES (?, ?, ?, ?, ?)', 
            [id, name, theme, icon, parent_department_id || null]);
        
        await (0, logger_1.logSystemAction)(db, currentUser, 'CREATE_DEPARTMENT', `\u5275\u5efa\u90e8\u9580: ${name} (${id})${parent_department_id ? ' - \u5b50\u90e8\u9580' : ''}`);
        
        const newDepartment = await db.get('SELECT * FROM departments WHERE id = ?', [id]);
        res.status(201).json({ 
            department: newDepartment,
            message: '\u90e8\u9580\u5275\u5efa\u6210\u529f' 
        });
    }
    catch (error) {
        console.error('\u5275\u5efa\u90e8\u9580\u932f\u8aa4:', error);
        res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
    }
});

// PUT /api/departments/:id - \u66f4\u65b0\u90e8\u9580\u8cc7\u8a0a
router.put('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.Role.BOSS, types_1.Role.MANAGER]), async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        const { name, theme, icon, parent_department_id } = req.body;
        
        const existingDept = await db.get('SELECT * FROM departments WHERE id = ?', [id]);
        if (!existingDept) {
            return res.status(404).json({ error: '\u90e8\u9580\u4e0d\u5b58\u5728' });
        }
        
        // \u9632\u6b62\u5faa\u74b0\u5f15\u7528
        if (parent_department_id === id) {
            return res.status(400).json({ error: '\u90e8\u9580\u4e0d\u80fd\u8a2d\u5b9a\u81ea\u5df1\u70ba\u7236\u90e8\u9580' });
        }
        
        // \u9a57\u8b49\u7236\u90e8\u9580\u662f\u5426\u5b58\u5728
        if (parent_department_id) {
            const parentDept = await db.get('SELECT * FROM departments WHERE id = ?', [parent_department_id]);
            if (!parentDept) {
                return res.status(400).json({ error: '\u7236\u90e8\u9580\u4e0d\u5b58\u5728' });
            }
            
            // \u6aa2\u67e5\u662f\u5426\u6703\u9020\u6210\u5faa\u74b0\uff08\u7236\u90e8\u9580\u662f\u5426\u662f\u7576\u524d\u90e8\u9580\u7684\u5b50\u5b6b\u90e8\u9580\uff09
            let checkId = parent_department_id;
            while (checkId) {
                if (checkId === id) {
                    return res.status(400).json({ error: '\u4e0d\u80fd\u8a2d\u5b9a\u5b50\u90e8\u9580\u70ba\u7236\u90e8\u9580\uff0c\u6703\u9020\u6210\u5faa\u74b0\u5f15\u7528' });
                }
                const nextParent = await db.get('SELECT parent_department_id FROM departments WHERE id = ?', [checkId]);
                checkId = nextParent ? nextParent.parent_department_id : null;
            }
        }
        
        if (theme) {
            const validThemes = ['slate', 'blue', 'purple', 'rose', 'emerald', 'orange', 'cyan'];
            if (!validThemes.includes(theme)) {
                return res.status(400).json({ error: '\u7121\u6548\u7684\u4e3b\u984c' });
            }
        }
        
        const updates = [];
        const params = [];
        
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
        if (parent_department_id !== undefined) {
            updates.push('parent_department_id = ?');
            params.push(parent_department_id || null);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: '\u6c92\u6709\u9700\u8981\u66f4\u65b0\u7684\u6b04\u4f4d' });
        }
        
        params.push(id);
        await db.run(`UPDATE departments SET ${updates.join(', ')} WHERE id = ?`, params);
        await (0, logger_1.logSystemAction)(db, currentUser, 'UPDATE_DEPARTMENT', `\u66f4\u65b0\u90e8\u9580: ${existingDept.name} (${id})`);
        
        const updatedDepartment = await db.get('SELECT * FROM departments WHERE id = ?', [id]);
        res.json({
            department: updatedDepartment,
            message: '\u90e8\u9580\u66f4\u65b0\u6210\u529f'
        });
    }
    catch (error) {
        console.error('\u66f4\u65b0\u90e8\u9580\u932f\u8aa4:', error);
        res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
    }
});

// DELETE /api/departments/:id - \u522a\u9664\u90e8\u9580
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.Role.BOSS]), async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        
        const departmentToDelete = await db.get('SELECT * FROM departments WHERE id = ?', [id]);
        if (!departmentToDelete) {
            return res.status(404).json({ error: '\u90e8\u9580\u4e0d\u5b58\u5728' });
        }
        
        // \u6aa2\u67e5\u662f\u5426\u6709\u5b50\u90e8\u9580
        const subdepartmentCount = await db.get('SELECT COUNT(*) as count FROM departments WHERE parent_department_id = ?', [id]);
        if (subdepartmentCount.count > 0) {
            return res.status(400).json({
                error: '\u8a72\u90e8\u9580\u9084\u6709\u5b50\u90e8\u9580\uff0c\u7121\u6cd5\u522a\u9664\u3002\u8acb\u5148\u522a\u9664\u6216\u91cd\u65b0\u5206\u914d\u5b50\u90e8\u9580\u3002'
            });
        }
        
        const userCount = await db.get('SELECT COUNT(*) as count FROM users WHERE department = ?', [id]);
        if (userCount.count > 0) {
            return res.status(400).json({
                error: '\u8a72\u90e8\u9580\u9084\u6709\u7528\u6236\uff0c\u7121\u6cd5\u522a\u9664\u3002\u8acb\u5148\u79fb\u9664\u6216\u91cd\u65b0\u5206\u914d\u7528\u6236\u3002'
            });
        }
        
        const taskCount = await db.get('SELECT COUNT(*) as count FROM tasks WHERE target_department = ? OR assigned_to_department = ?', [id, id]);
        if (taskCount.count > 0) {
            return res.status(400).json({
                error: '\u8a72\u90e8\u9580\u9084\u6709\u76f8\u95dc\u4efb\u52d9\uff0c\u7121\u6cd5\u522a\u9664\u3002\u8acb\u5148\u8655\u7406\u76f8\u95dc\u4efb\u52d9\u3002'
            });
        }
        
        await db.run('DELETE FROM departments WHERE id = ?', [id]);
        await (0, logger_1.logSystemAction)(db, currentUser, 'DELETE_DEPARTMENT', `\u522a\u9664\u90e8\u9580: ${departmentToDelete.name} (${id})`);
        
        res.json({ message: '\u90e8\u9580\u522a\u9664\u6210\u529f' });
    }
    catch (error) {
        console.error('\u522a\u9664\u90e8\u9580\u932f\u8aa4:', error);
        res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
    }
});

// GET /api/departments/:id/tasks - \u7372\u53d6\u90e8\u9580\u4efb\u52d9
router.get('/:id/tasks', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        
        if (currentUser.role === 'EMPLOYEE' && currentUser.department !== id) {
            return res.status(403).json({ error: '\u7121\u6b0a\u8a2a\u554f\u6b64\u90e8\u9580\u4efb\u52d9' });
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
        const params = [id, id];
        
        if (status) {
            query += ' AND t.status = ?';
            params.push(status);
        }
        
        if (urgency) {
            query += ' AND t.urgency = ?';
            params.push(urgency);
        }
        
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
    }
    catch (error) {
        console.error('\u7372\u53d6\u90e8\u9580\u4efb\u52d9\u932f\u8aa4:', error);
        res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
    }
});

// GET /api/departments/:id/members - \u7372\u53d6\u90e8\u9580\u6210\u54e1
router.get('/:id/members', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        
        if (currentUser.role === 'EMPLOYEE' && currentUser.department !== id) {
            return res.status(403).json({ error: '\u7121\u6b0a\u8a2a\u554f\u6b64\u90e8\u9580\u6210\u54e1' });
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
    }
    catch (error) {
        console.error('\u7372\u53d6\u90e8\u9580\u6210\u54e1\u932f\u8aa4:', error);
        res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
    }
});
