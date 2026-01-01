// 修復任務權限邏輯
// 1. 員工可以接取部門任務
// 2. 主管可以看到 assigned_to_department 的任務
// 3. 優化任務查詢邏輯

const fs = require('fs');

const fixedTasksRoute = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const router = (0, express_1.Router)();

// GET /api/tasks - 獲取任務列表
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { status, urgency, department, assigned_to, created_by, is_archived = 'false', page = '1', limit = '50' } = req.query;
        
        let query = \`
      SELECT t.*,
             u.name as assigned_user_name,
             creator.name as created_by_name,
             dept.name as department_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to_user_id = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      LEFT JOIN departments dept ON t.target_department = dept.id
      WHERE 1=1
    \`;
        const params = [];
        
        // 權限過濾
        if (currentUser.role === types_1.Role.EMPLOYEE) {
            // 員工可以看到：分配給自己 OR 分配給自己部門的任務
            query += ' AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ? OR t.created_by = ?)';
            params.push(currentUser.id, currentUser.department, currentUser.id);
        }
        else if (currentUser.role === types_1.Role.SUPERVISOR) {
            // 主管可以看到：目標部門是自己部門 OR 分配給自己部門 OR 自己創建的任務
            query += ' AND (t.target_department = ? OR t.assigned_to_department = ? OR t.created_by = ?)';
            params.push(currentUser.department, currentUser.department, currentUser.id);
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
        
        // 封存過濾
        const isArchived = is_archived === 'true';
        if (isArchived) {
            query += ' AND (t.is_archived = 1 OR t.status = ?)';
            params.push(types_1.TaskStatus.CANCELLED);
        }
        else {
            query += ' AND (t.is_archived = 0 OR t.is_archived IS NULL) AND t.status != ?';
            params.push(types_1.TaskStatus.CANCELLED);
        }
        
        // 排序
        query += ' ORDER BY t.created_at DESC';
        
        // 分頁
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const offset = (pageNum - 1) * limitNum;
        query += \` LIMIT \${limitNum} OFFSET \${offset}\`;
        
        const tasks = await db.all(query, params);
        
        // 獲取總數
        let countQuery = 'SELECT COUNT(*) as total FROM tasks t WHERE 1=1';
        const countParams = [];
        
        if (currentUser.role === types_1.Role.EMPLOYEE) {
            countQuery += ' AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ? OR t.created_by = ?)';
            countParams.push(currentUser.id, currentUser.department, currentUser.id);
        }
        else if (currentUser.role === types_1.Role.SUPERVISOR) {
            countQuery += ' AND (t.target_department = ? OR t.assigned_to_department = ? OR t.created_by = ?)';
            countParams.push(currentUser.department, currentUser.department, currentUser.id);
        }
        
        if (isArchived) {
            countQuery += ' AND (t.is_archived = 1 OR t.status = ?)';
            countParams.push(types_1.TaskStatus.CANCELLED);
        }
        else {
            countQuery += ' AND (t.is_archived = 0 OR t.is_archived IS NULL) AND t.status != ?';
            countParams.push(types_1.TaskStatus.CANCELLED);
        }
        
        const countResult = await db.get(countQuery, countParams);
        const total = countResult.total;
        
        res.json({
            tasks,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    }
    catch (error) {
        console.error('獲取任務列表錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// POST /api/tasks/:id/accept - 接取任務（修復版）
router.post('/:id/accept', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        
        const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
        if (!task) {
            return res.status(404).json({ error: '任務不存在' });
        }
        
        // 權限檢查（修復：員工可以接取部門任務）
        const canAccept = 
            task.status === types_1.TaskStatus.OPEN ||  // 公開任務
            task.assigned_to_user_id === currentUser.id ||  // 指定給我
            (task.assigned_to_department === currentUser.department);  // 指定給我的部門（員工和主管都可以）
        
        if (!canAccept) {
            return res.status(403).json({ error: '無權接取此任務' });
        }
        
        // 更新任務狀態
        await db.run(\`
            UPDATE tasks 
            SET status = ?, 
                accepted_by_user_id = ?,
                version = version + 1
            WHERE id = ?
        \`, [types_1.TaskStatus.ASSIGNED, currentUser.id, id]);
        
        // 添加時間軸記錄
        await db.run(\`
            INSERT INTO task_timeline (id, task_id, user_id, action, timestamp)
            VALUES (?, ?, ?, ?, datetime('now'))
        \`, [\`tl-\${Date.now()}\`, id, currentUser.id, '接取任務']);
        
        res.json({ message: '任務接取成功' });
    }
    catch (error) {
        console.error('接取任務錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

exports.tasksRoutes = router;
`;

console.log('修復腳本已準備完成');
console.log('將修復以下問題：');
console.log('1. 員工查詢邏輯：增加 created_by 條件');
console.log('2. 主管查詢邏輯：增加 assigned_to_department 條件');
console.log('3. 接取任務邏輯：允許員工接取部門任務');
