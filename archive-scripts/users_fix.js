"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const types_1 = require("../types");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
exports.userRoutes = router;

// 密碼加密
async function hashPassword(password) {
    const saltRounds = 12;
    return bcrypt_1.default.hash(password, saltRounds);
}

// GET /api/users - 獲取用戶列表（所有登入用戶都可以查看通訊錄）
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        
        // 所有登入用戶都可以看到用戶列表（用於通訊錄）
        let query = 'SELECT id, name, role, department, avatar, username, created_at, updated_at FROM users';
        let params = [];
        
        query += ' ORDER BY role DESC, name ASC';
        const users = await db.all(query, params);
        
        // 解析 permissions 欄位
        const usersWithPermissions = users.map(user => ({
            ...user,
            permissions: user.permissions ? JSON.parse(user.permissions) : []
        }));
        
        console.log('[Users] 返回用戶列表，數量:', usersWithPermissions.length);
        res.json(usersWithPermissions);
    }
    catch (error) {
        console.error('獲取用戶列表錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// GET /api/users/:id - 獲取特定用戶資訊
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const { id } = req.params;
        const userRow = await db.get('SELECT id, name, role, department, avatar, username, created_at, updated_at FROM users WHERE id = ?', [id]);
        if (!userRow) {
            return res.status(404).json({ error: '用戶不存在' });
        }
        const user = {
            ...userRow,
            permissions: userRow.permissions ? JSON.parse(userRow.permissions) : []
        };
        res.json(user);
    }
    catch (error) {
        console.error('獲取用戶資訊錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// POST /api/users - 創建新用戶（需要管理員權限）
router.post('/', auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.Role.BOSS, types_1.Role.MANAGER]), async (req, res) => {
    try {
        const db = req.db;
        const { name, username, password, role, department, avatar, permissions } = req.body;
        
        if (!name || !username || !password || !role || !department) {
            return res.status(400).json({
                error: '請提供完整的用戶資訊（姓名、用戶名、密碼、角色、部門）'
            });
        }
        
        if (!Object.values(types_1.Role).includes(role)) {
            return res.status(400).json({ error: '無效的用戶角色' });
        }
        
        const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser) {
            return res.status(400).json({ error: '用戶名已存在' });
        }
        
        const hashedPassword = await hashPassword(password);
        const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        
        await db.run(
            'INSERT INTO users (id, name, username, password, role, department, avatar, permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, username, hashedPassword, role, department, avatar || '', JSON.stringify(permissions || []), now, now]
        );
        
        const newUser = await db.get('SELECT id, name, role, department, avatar, username, created_at, updated_at FROM users WHERE id = ?', [id]);
        res.status(201).json({ ...newUser, permissions: permissions || [] });
    }
    catch (error) {
        console.error('創建用戶錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// PUT /api/users/:id - 更新用戶資訊
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        const { name, username, password, role, department, avatar, permissions } = req.body;
        
        const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        if (!targetUser) {
            return res.status(404).json({ error: '用戶不存在' });
        }
        
        const isSelf = currentUser.id === id;
        const isAdmin = currentUser.role === types_1.Role.BOSS || currentUser.role === types_1.Role.MANAGER;
        
        // 自己編輯自己時，不允許修改角色、部門、權限
        if (isSelf && !isAdmin) {
            if (role !== undefined && role !== targetUser.role) {
                return res.status(403).json({ error: '無權修改自己的角色' });
            }
            if (department !== undefined && department !== targetUser.department) {
                return res.status(403).json({ error: '無權修改自己的部門' });
            }
            if (permissions !== undefined) {
                return res.status(403).json({ error: '無權修改自己的權限' });
            }
        }
        
        // 非管理員不能修改其他人
        if (!isSelf && !isAdmin) {
            return res.status(403).json({ error: '無權修改其他用戶' });
        }
        
        const updates = [];
        const params = [];
        
        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (username !== undefined) { updates.push('username = ?'); params.push(username); }
        if (password !== undefined && password.trim()) {
            const hashedPassword = await hashPassword(password);
            updates.push('password = ?');
            params.push(hashedPassword);
        }
        if (role !== undefined && isAdmin) { updates.push('role = ?'); params.push(role); }
        if (department !== undefined && isAdmin) { updates.push('department = ?'); params.push(department); }
        if (avatar !== undefined) { updates.push('avatar = ?'); params.push(avatar); }
        if (permissions !== undefined && isAdmin) { updates.push('permissions = ?'); params.push(JSON.stringify(permissions)); }
        
        updates.push('updated_at = ?');
        params.push(new Date().toISOString());
        params.push(id);
        
        await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
        
        const updatedUser = await db.get('SELECT id, name, role, department, avatar, username, created_at, updated_at, permissions FROM users WHERE id = ?', [id]);
        res.json({
            ...updatedUser,
            permissions: updatedUser.permissions ? JSON.parse(updatedUser.permissions) : []
        });
    }
    catch (error) {
        console.error('更新用戶錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// DELETE /api/users/:id - 刪除用戶（需要管理員權限）
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.Role.BOSS, types_1.Role.MANAGER]), async (req, res) => {
    try {
        const db = req.db;
        const { id } = req.params;
        
        const targetUser = await db.get('SELECT id FROM users WHERE id = ?', [id]);
        if (!targetUser) {
            return res.status(404).json({ error: '用戶不存在' });
        }
        
        await db.run('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('刪除用戶錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// POST /api/users/:id/avatar - 上傳頭像
router.post('/:id/avatar', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        const { avatar } = req.body;
        
        // 任何人都可以上傳自己的頭像
        if (currentUser.id !== id && currentUser.role !== types_1.Role.BOSS && currentUser.role !== types_1.Role.MANAGER) {
            return res.status(403).json({ error: '無權修改其他用戶的頭像' });
        }
        
        await db.run('UPDATE users SET avatar = ?, updated_at = ? WHERE id = ?', [avatar, new Date().toISOString(), id]);
        res.json({ success: true, avatar });
    }
    catch (error) {
        console.error('上傳頭像錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
