"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
const auth_1 = require("../middleware/auth");
const UserService = require('../../services/userService');
const router = express_1.default.Router();
exports.userRoutes = router;
// 密碼加密
async function hashPassword(password) {
    const saltRounds = 12;
    return bcrypt_1.default.hash(password, saltRounds);
}
// GET /api/users - 獲取用戶列表（需要管理員權限）
router.get('/', auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.Role.BOSS, types_1.Role.MANAGER, types_1.Role.SUPERVISOR]), async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        let query = 'SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users';
        let params = [];
        // SUPERVISOR 只能看到自己部門的用戶
        // 移除 SUPERVISOR 部門限制 - 所有角色都可以看到所有用戶
        const usersWithPermissions = await UserService.getAllUsers(db, currentUser);
        res.json(usersWithPermissions);
    }
    catch (error) {
        console.error('獲取用戶列表錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
// GET /api/users/me - 獲取當前登入用戶資訊
router.get('/me', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const user = await UserService.getUserById(db, currentUser.id);
        if (!user) {
            return res.status(404).json({ error: '\u7528\u6236\u4e0d\u5b58\u5728' });
        }
        res.json(user);
    }
    catch (error) {
        console.error('\u7372\u53d6\u7576\u524d\u7528\u6236\u932f\u8aa4:', error);
        res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
    }
});
// GET /api/users/:id - 獲取特定用戶資訊
router.get('/:id', auth_1.authenticateToken, (0, auth_1.requireSelfOrAdmin)('id'), async (req, res) => {
    try {
        const db = req.db;
        const { id } = req.params;
        const user = await UserService.getUserById(db, id);
        if (!user) {
            return res.status(404).json({ error: '\u7528\u6236\u4e0d\u5b58\u5728' });
        }
        res.json(user);
    }
    catch (error) {
        console.error('獲取用戶資訊錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
// POST /api/users - 創建新用戶（需要管理員權限）
router.post('/', auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.Role.BOSS, types_1.Role.MANAGER, types_1.Role.SUPERVISOR]), async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { name, username, password, role, department, avatar, permissions } = req.body;
        // 驗證必要欄位
        if (!name || !username || !password || !role || !department) {
            return res.status(400).json({
                error: '請提供完整的用戶資訊（姓名、用戶名、密碼、角色、部門）'
            });
        }
        // 驗證角色
        if (!Object.values(types_1.Role).includes(role)) {
            return res.status(400).json({ error: '無效的用戶角色' });
        }
        // 只有 BOSS 可以創建 BOSS 角色用戶
        if (role === types_1.Role.BOSS && currentUser.role !== types_1.Role.BOSS) {
            return res.status(403).json({ error: '只有 BOSS 可以創建 BOSS 角色用戶' });
        }
        // MANAGER 不能創建其他 MANAGER
        if (role === types_1.Role.MANAGER && currentUser.role !== types_1.Role.BOSS) {
            return res.status(403).json({ error: '只有 BOSS 可以創建 MANAGER 角色用戶' });
        }
        // 檢查用戶名是否已存在
        const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser) {
            return res.status(400).json({ error: '用戶名已存在' });
        }
        // SUPERVISOR 只能新增自己部門或待分配新人的員工
        if (currentUser.role === types_1.Role.SUPERVISOR) {
            if (department !== currentUser.department && department !== 'UNASSIGNED') {
                return res.status(403).json({ error: '\u4e3b\u7ba1\u53ea\u80fd\u65b0\u589e\u81ea\u5df1\u90e8\u9580\u6216\u5f85\u5206\u914d\u65b0\u4eba\u7684\u4eba\u54e1' });
            }
            if (role !== types_1.Role.EMPLOYEE) {
                return res.status(403).json({ error: '\u4e3b\u7ba1\u53ea\u80fd\u65b0\u589e\u4e00\u822c\u54e1\u5de5' });
            }
        }
                // 檢查部門是否存在
        const deptExists = await db.get('SELECT id FROM departments WHERE id = ?', [department]);
        if (!deptExists) {
            return res.status(400).json({ error: '指定的部門不存在' });
        }
        // 加密密碼
        const hashedPassword = await hashPassword(password);
        // 生成用戶 ID
        const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // 插入用戶
        await db.run(`INSERT INTO users (id, name, role, department, avatar, username, password, permissions, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, [
            userId,
            name,
            role,
            department,
            avatar || '',
            username,
            hashedPassword,
            permissions ? JSON.stringify(permissions) : null
        ]);
        // 記錄日誌
        const newUser = {
            id: userId,
            name,
            role,
            department,
            avatar: avatar || '',
            username,
            password: hashedPassword,
            permissions
        };
        await (0, logger_1.logSystemAction)(db, currentUser, 'CREATE_USER', `創建用戶: ${name} (${username})`);
        // 返回創建的用戶資訊（不包含密碼）
        const { password: _, ...userWithoutPassword } = newUser;
        
        // Broadcast WebSocket event
        if (req.wsServer) {
            req.wsServer.broadcastToAll('USER_CREATED', {
                user: newUser,
                timestamp: new Date().toISOString()
            });
        }
        res.status(201).json({
            user: userWithoutPassword,
            message: '用戶創建成功'
        });
    }
    catch (error) {
        console.error('創建用戶錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
// PUT /api/users/:id - 更新用戶資訊
router.put('/:id', auth_1.authenticateToken, (0, auth_1.requireSelfOrAdmin)('id'), async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        const { name, role, department, avatar, permissions } = req.body;
        // 獲取現有用戶
        const existingUser = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        if (!existingUser) {
            return res.status(404).json({ error: '用戶不存在' });
        }
        // 權限檢查
        const isSelf = currentUser.id === id;
        // 更新自己的資訊只能修改 name 和 avatar
        if (isSelf) {
            if (role || department || permissions) {
                return res.status(403).json({ error: '無權修改自己的角色、部門或權限' });
            }
        }
        else {
            // 管理員修改其他用戶的權限檢查
            if (role && !Object.values(types_1.Role).includes(role)) {
                return res.status(400).json({ error: '無效的用戶角色' });
            }
            if (role === types_1.Role.BOSS && currentUser.role !== types_1.Role.BOSS) {
                return res.status(403).json({ error: '只有 BOSS 可以設定 BOSS 角色' });
            }
            if (role === types_1.Role.MANAGER && currentUser.role !== types_1.Role.BOSS) {
                return res.status(403).json({ error: '只有 BOSS 可以設定 MANAGER 角色' });
            }
        }
        // 構建更新語句
        const updates = [];
        const params = [];
        if (name !== undefined) {
            updates.push('name = ?');
            params.push(name);
        }
        if (role !== undefined && !isSelf) {
            updates.push('role = ?');
            params.push(role);
        }
        if (department !== undefined && !isSelf) {
            // 檢查部門是否存在
            const deptExists = await db.get('SELECT id FROM departments WHERE id = ?', [department]);
            if (!deptExists) {
                return res.status(400).json({ error: '指定的部門不存在' });
            }
            updates.push('department = ?');
            params.push(department);
        }
        if (avatar !== undefined) {
            updates.push('avatar = ?');
            params.push(avatar);
        }
        if (permissions !== undefined && !isSelf) {
            updates.push('permissions = ?');
            params.push(JSON.stringify(permissions));
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: '沒有需要更新的欄位' });
        }
        updates.push('updated_at = datetime(\'now\')');
        params.push(id);
        // Build update data for UserService
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (role !== undefined && !isSelf) updateData.role = role;
        if (department !== undefined && !isSelf) updateData.department = department;
        if (avatar !== undefined) updateData.avatar = avatar;
        if (permissions !== undefined && !isSelf) updateData.permissions = permissions;
        
        await UserService.updateUser(db, id, updateData);
        // 記錄日誌
        const action = isSelf ? 'UPDATE_SELF' : 'UPDATE_USER';
        const details = isSelf
            ? `更新個人資訊: ${name || existingUser.name}`
            : `更新用戶: ${existingUser.name} (${existingUser.username})`;
        await (0, logger_1.logSystemAction)(db, currentUser, action, details);
        // 獲取更新後的用戶資訊
        const updatedUser = await db.get('SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users WHERE id = ?', [id]);
        const userWithPermissions = {
            ...updatedUser,
            permissions: updatedUser.permissions ? JSON.parse(updatedUser.permissions) : undefined
        };
        res.json({
            user: userWithPermissions,
            message: '用戶資訊更新成功'
        });
    }
    catch (error) {
        console.error('更新用戶錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
// DELETE /api/users/:id - 刪除用戶（需要 BOSS 或 MANAGER 權限）
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        // 不能刪除自己
        if (currentUser.id === id) {
            return res.status(400).json({ error: '不能刪除自己的帳號' });
        }
        // 獲取要刪除的用戶
        const userToDelete = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        if (!userToDelete) {
            return res.status(404).json({ error: '用戶不存在' });
        }
        // 權限檢查
        if (currentUser.role === types_1.Role.MANAGER) {
            // MANAGER 不能刪除 BOSS 或其他 MANAGER
            if (userToDelete.role === types_1.Role.BOSS || userToDelete.role === types_1.Role.MANAGER) {
                return res.status(403).json({ error: '無權刪除該用戶' });
            }
        }
        // 檢查是否有相關聯的數據（任務、出勤記錄等）
        const taskCount = await db.get('SELECT COUNT(*) as count FROM tasks WHERE assigned_to_user_id = ? OR created_by = ?', [id, id]);
        const attendanceCount = await db.get('SELECT COUNT(*) as count FROM attendance_records WHERE user_id = ?', [id]);
        if (taskCount.count > 0 || attendanceCount.count > 0) {
            return res.status(400).json({
                error: '該用戶有相關聯的數據（任務或出勤記錄），無法刪除。建議停用帳號而非刪除。'
            });
        }
        // 刪除用戶
        // Delete related data first to avoid foreign key constraints
        await UserService.deleteUser(db, id);
        // 記錄日誌
        await (0, logger_1.logSystemAction)(db, currentUser, 'DELETE_USER', `刪除用戶: ${userToDelete.name} (${userToDelete.username})`);
        res.json({ message: '用戶刪除成功' });
    }
    catch (error) {
        console.error('刪除用戶錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
// POST /api/users/:id/reset-password - 重置用戶密碼（需要管理員權限）
router.post('/:id/reset-password', auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.Role.BOSS, types_1.Role.MANAGER]), async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: '新密碼長度至少需要 6 個字元' });
        }
        // 不能重置自己的密碼（應該用 change-password）
        if (currentUser.id === id) {
            return res.status(400).json({ error: '請使用修改密碼功能更新自己的密碼' });
        }
        // 獲取目標用戶
        const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        if (!targetUser) {
            return res.status(404).json({ error: '用戶不存在' });
        }
        // 權限檢查
        if (currentUser.role === types_1.Role.MANAGER) {
            // MANAGER 不能重置 BOSS 或其他 MANAGER 的密碼
            if (targetUser.role === types_1.Role.BOSS || targetUser.role === types_1.Role.MANAGER) {
                return res.status(403).json({ error: '無權重設該用戶密碼' });
            }
        }
        // 加密新密碼
        const hashedPassword = await hashPassword(newPassword);
        // 更新密碼
        await db.run('UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?', [hashedPassword, id]);
        // 記錄日誌
        await (0, logger_1.logSystemAction)(db, currentUser, 'RESET_PASSWORD', `重置用戶密碼: ${targetUser.name} (${targetUser.username})`);
        res.json({ message: '密碼重置成功' });
    }
    catch (error) {
        console.error('重置密碼錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
// GET /api/users/department/:departmentId - 獲取部門用戶
router.get('/department/:departmentId', auth_1.authenticateToken, (0, auth_1.requireDepartmentAccess)('departmentId'), async (req, res) => {
    try {
        const db = req.db;
        const { departmentId } = req.params;
        const usersWithPermissions = await UserService.getUsersByDepartment(db, departmentId);
        res.json(usersWithPermissions);
    }
    catch (error) {
        console.error('獲取部門用戶錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// Avatar upload route
router.post('/:id/avatar', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { avatar } = req.body;
        const db = req.db;
        const currentUser = req.user;

        if (!avatar) {
            return res.status(400).json({ error: '缺少頭像數據' });
        }

        // Check permissions
        const isSelf = currentUser.id === id;
        const isBossOrManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';
        const canUpdate = isSelf || isBossOrManager;

        if (!canUpdate) {
            return res.status(403).json({ error: '權限不足' });
        }

        // Update avatar
        await db.run('UPDATE users SET avatar = ?, updated_at = ? WHERE id = ?', [
            avatar,
            new Date().toISOString(),
            id
        ]);

        // Get updated user
        const updatedUser = await db.get(
            'SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users WHERE id = ?',
            [id]
        );

        if (!updatedUser) {
            return res.status(404).json({ error: '用戶不存在' });
        }

        res.json({
            success: true,
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                role: updatedUser.role,
                department: updatedUser.department,
                avatar: updatedUser.avatar,
                username: updatedUser.username,
                permissions: updatedUser.permissions ? JSON.parse(updatedUser.permissions) : {},
                createdAt: updatedUser.created_at,
                updatedAt: updatedUser.updated_at
            }
        });
    } catch (error) {
        console.error('Update avatar error:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});


// POST /api/users/:id/change-password - \u4fee\u6539\u5bc6\u78bc
router.post('/:id/change-password', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;
        const currentUser = req.user;
        
        // \u53ea\u80fd\u4fee\u6539\u81ea\u5df1\u7684\u5bc6\u78bc
        if (currentUser.id !== id) {
            return res.status(403).json({ error: '\u7121\u6b0a\u4fee\u6539\u4ed6\u4eba\u5bc6\u78bc' });
        }
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: '\u8acb\u63d0\u4f9b\u76ee\u524d\u5bc6\u78bc\u548c\u65b0\u5bc6\u78bc' });
        }
        
        if (newPassword.length < 4) {
            return res.status(400).json({ error: '\u65b0\u5bc6\u78bc\u81f3\u5c11\u9700\u8981 4 \u500b\u5b57\u5143' });
        }
        
        const db = req.db;
        
        // \u7372\u53d6\u7528\u6236
        const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        if (!user) {
            return res.status(404).json({ error: '\u7528\u6236\u4e0d\u5b58\u5728' });
        }
        
        // \u9a57\u8b49\u76ee\u524d\u5bc6\u78bc
        const bcrypt = require('bcrypt');
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return res.status(401).json({ error: '\u76ee\u524d\u5bc6\u78bc\u4e0d\u6b63\u78ba' });
        }
        
        // \u52a0\u5bc6\u65b0\u5bc6\u78bc
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        // \u66f4\u65b0\u5bc6\u78bc
        await db.run('UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?', [hashedPassword, id]);
        
        // \u8a18\u9304\u65e5\u8a8c
        try {
            db.logAction(user.id, user.name, 'CHANGE_PASSWORD', '\u7528\u6236\u4fee\u6539\u5bc6\u78bc', 'INFO');
        } catch (error) {
            console.error('\u8a18\u9304\u5bc6\u78bc\u4fee\u6539\u65e5\u8a8c\u5931\u6557:', error);
        }
        
        
        // Broadcast WebSocket event
        if (req.wsServer) {
            const updatedUser = await db.get('SELECT id, name, role, department, avatar, username, permissions FROM users WHERE id = ?', [id]);
            req.wsServer.broadcastToAll('USER_UPDATED', {
                user: updatedUser,
                timestamp: new Date().toISOString()
            });
        }
        
        // Broadcast WebSocket event
        if (req.wsServer) {
            req.wsServer.broadcastToAll('USER_DELETED', {
                userId: id,
                timestamp: new Date().toISOString()
            });
        }
        res.json({ success: true, message: '\u5bc6\u78bc\u4fee\u6539\u6210\u529f' });
    } catch (error) {
        console.error('\u4fee\u6539\u5bc6\u78bc\u932f\u8aa4:', error);
        res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
    }
});

//# sourceMappingURL=users.js.map