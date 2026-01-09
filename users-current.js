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
const router = express_1.default.Router();
exports.userRoutes = router;
// 撖Ⅳ??
async function hashPassword(password) {
    const saltRounds = 12;
    return bcrypt_1.default.hash(password, saltRounds);
}
// GET /api/users - ?脣??冽?”嚗?閬恣?甈?嚗?router.get('/', auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.Role.BOSS, types_1.Role.MANAGER, types_1.Role.SUPERVISOR]), async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        let query = 'SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users';
        let params = [];
        // SUPERVISOR ?芾??芸楛?券????        // 蝘駁 SUPERVISOR ?券?? - ????脤?臭誑?????        const users = await db.all(query, params);
        // 閫?? permissions 甈?
        const usersWithPermissions = users.map(user => ({
            ...user,
            permissions: user.permissions ? JSON.parse(user.permissions) : undefined
        }));
        res.json(usersWithPermissions);
    }
    catch (error) {
        console.error('?脣??冽?”?航炊:', error);
        res.status(500).json({ error: '隡箸??典?券隤? });
    }
});
// GET /api/users/:id - ?脣??孵??冽鞈?
router.get('/:id', auth_1.authenticateToken, (0, auth_1.requireSelfOrAdmin)('id'), async (req, res) => {
    try {
        const db = req.db;
        const { id } = req.params;
        const userRow = await db.get('SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users WHERE id = ?', [id]);
        if (!userRow) {
            return res.status(404).json({ error: '?冽銝??? });
        }
        const user = {
            ...userRow,
            permissions: userRow.permissions ? JSON.parse(userRow.permissions) : undefined
        };
        res.json(user);
    }
    catch (error) {
        console.error('?脣??冽鞈??航炊:', error);
        res.status(500).json({ error: '隡箸??典?券隤? });
    }
});
// POST /api/users - ?萄遣?啁?塚??閬恣?甈?嚗?router.post('/', auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.Role.BOSS, types_1.Role.MANAGER, types_1.Role.SUPERVISOR]), async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { name, username, password, role, department, avatar, permissions } = req.body;
        // 撽?敹?甈?
        if (!name || !username || !password || !role || !department) {
            return res.status(400).json({
                error: '隢?靘??渡??冽鞈?嚗???嗅???蝣潦??脯?嚗?
            });
        }
        // 撽?閫
        if (!Object.values(types_1.Role).includes(role)) {
            return res.status(400).json({ error: '?⊥???嗉??? });
        }
        // ?芣? BOSS ?臭誑?萄遣 BOSS 閫?冽
        if (role === types_1.Role.BOSS && currentUser.role !== types_1.Role.BOSS) {
            return res.status(403).json({ error: '?芣? BOSS ?臭誑?萄遣 BOSS 閫?冽' });
        }
        // MANAGER 銝?萄遣?嗡? MANAGER
        if (role === types_1.Role.MANAGER && currentUser.role !== types_1.Role.BOSS) {
            return res.status(403).json({ error: '?芣? BOSS ?臭誑?萄遣 MANAGER 閫?冽' });
        }
        // 瑼Ｘ?冽??血歇摮
        const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser) {
            return res.status(400).json({ error: '?冽?歇摮' });
        }
        // SUPERVISOR ?芾?啣??芸楛?券??????唬犖?撌?        if (currentUser.role === types_1.Role.SUPERVISOR) {
            if (department !== currentUser.department && department !== 'UNASSIGNED') {
                return res.status(403).json({ error: '\u4e3b\u7ba1\u53ea\u80fd\u65b0\u589e\u81ea\u5df1\u90e8\u9580\u6216\u5f85\u5206\u914d\u65b0\u4eba\u7684\u4eba\u54e1' });
            }
            if (role !== types_1.Role.EMPLOYEE) {
                return res.status(403).json({ error: '\u4e3b\u7ba1\u53ea\u80fd\u65b0\u589e\u4e00\u822c\u54e1\u5de5' });
            }
        }
                // 瑼Ｘ?券??臬摮
        const deptExists = await db.get('SELECT id FROM departments WHERE id = ?', [department]);
        if (!deptExists) {
            return res.status(400).json({ error: '????銝??? });
        }
        // ??撖Ⅳ
        const hashedPassword = await hashPassword(password);
        // ???冽 ID
        const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // ??冽
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
        // 閮??亥?
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
        await (0, logger_1.logSystemAction)(db, currentUser, 'CREATE_USER', `?萄遣?冽: ${name} (${username})`);
        // 餈??萄遣??嗉?閮?銝??怠?蝣潘?
        const { password: _, ...userWithoutPassword } = newUser;
        res.status(201).json({
            user: userWithoutPassword,
            message: '?冽?萄遣??'
        });
    }
    catch (error) {
        console.error('?萄遣?冽?航炊:', error);
        res.status(500).json({ error: '隡箸??典?券隤? });
    }
});
// PUT /api/users/:id - ?湔?冽鞈?
router.put('/:id', auth_1.authenticateToken, (0, auth_1.requireSelfOrAdmin)('id'), async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        const { name, role, department, avatar, permissions } = req.body;
        // ?脣??暹??冽
        const existingUser = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        if (!existingUser) {
            return res.status(404).json({ error: '?冽銝??? });
        }
        // 甈?瑼Ｘ
        const isSelf = currentUser.id === id;
        // ?湔?芸楛??閮?賭耨??name ??avatar
        if (isSelf) {
            if (role || department || permissions) {
                return res.status(403).json({ error: '?⊥?靽格?芸楛???脯????? });
            }
        }
        else {
            // 蝞∠??∩耨?孵隞?嗥?甈?瑼Ｘ
            if (role && !Object.values(types_1.Role).includes(role)) {
                return res.status(400).json({ error: '?⊥???嗉??? });
            }
            if (role === types_1.Role.BOSS && currentUser.role !== types_1.Role.BOSS) {
                return res.status(403).json({ error: '?芣? BOSS ?臭誑閮剖? BOSS 閫' });
            }
            if (role === types_1.Role.MANAGER && currentUser.role !== types_1.Role.BOSS) {
                return res.status(403).json({ error: '?芣? BOSS ?臭誑閮剖? MANAGER 閫' });
            }
        }
        // 瑽遣?湔隤
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
            // 瑼Ｘ?券??臬摮
            const deptExists = await db.get('SELECT id FROM departments WHERE id = ?', [department]);
            if (!deptExists) {
                return res.status(400).json({ error: '????銝??? });
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
            return res.status(400).json({ error: '瘝??閬?啁?甈?' });
        }
        updates.push('updated_at = datetime(\'now\')');
        params.push(id);
        await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
        // 閮??亥?
        const action = isSelf ? 'UPDATE_SELF' : 'UPDATE_USER';
        const details = isSelf
            ? `?湔?犖鞈?: ${name || existingUser.name}`
            : `?湔?冽: ${existingUser.name} (${existingUser.username})`;
        await (0, logger_1.logSystemAction)(db, currentUser, action, details);
        // ?脣??湔敺??冽鞈?
        const updatedUser = await db.get('SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users WHERE id = ?', [id]);
        const userWithPermissions = {
            ...updatedUser,
            permissions: updatedUser.permissions ? JSON.parse(updatedUser.permissions) : undefined
        };
        res.json({
            user: userWithPermissions,
            message: '?冽鞈??湔??'
        });
    }
    catch (error) {
        console.error('?湔?冽?航炊:', error);
        res.status(500).json({ error: '隡箸??典?券隤? });
    }
});
// DELETE /api/users/:id - ?芷?冽嚗?閬?BOSS ??MANAGER 甈?嚗?router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        // 銝?芷?芸楛
        if (currentUser.id === id) {
            return res.status(400).json({ error: '銝?芷?芸楛?董?? });
        }
        // ?脣?閬?斤??冽
        const userToDelete = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        if (!userToDelete) {
            return res.status(404).json({ error: '?冽銝??? });
        }
        // 甈?瑼Ｘ
        if (currentUser.role === types_1.Role.MANAGER) {
            // MANAGER 銝?芷 BOSS ?隞?MANAGER
            if (userToDelete.role === types_1.Role.BOSS || userToDelete.role === types_1.Role.MANAGER) {
                return res.status(403).json({ error: '?⊥??芷閰脩?? });
            }
        }
        // 瑼Ｘ?臬?????隞餃???方???嚗?        const taskCount = await db.get('SELECT COUNT(*) as count FROM tasks WHERE assigned_to_user_id = ? OR created_by = ?', [id, id]);
        const attendanceCount = await db.get('SELECT COUNT(*) as count FROM attendance_records WHERE user_id = ?', [id]);
        if (taskCount.count > 0 || attendanceCount.count > 0) {
            return res.status(400).json({
                error: '閰脩?嗆??賊??舐??豢?嚗遙???箏閮?嚗??⊥??芷?遣霅啣??典董???芷??
            });
        }
        // ?芷?冽
        await db.run('DELETE FROM users WHERE id = ?', [id]);
        // 閮??亥?
        await (0, logger_1.logSystemAction)(db, currentUser, 'DELETE_USER', `?芷?冽: ${userToDelete.name} (${userToDelete.username})`);
        res.json({ message: '?冽?芷??' });
    }
    catch (error) {
        console.error('?芷?冽?航炊:', error);
        res.status(500).json({ error: '隡箸??典?券隤? });
    }
});
// POST /api/users/:id/reset-password - ?蔭?冽撖Ⅳ嚗?閬恣?甈?嚗?router.post('/:id/reset-password', auth_1.authenticateToken, (0, auth_1.requireRole)([types_1.Role.BOSS, types_1.Role.MANAGER]), async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: '?啣?蝣潮摨西撠?閬?6 ???? });
        }
        // 銝?蔭?芸楛??蝣潘??府??change-password嚗?        if (currentUser.id === id) {
            return res.status(400).json({ error: '隢蝙?其耨?孵?蝣澆??賣?啗撌梁?撖Ⅳ' });
        }
        // ?脣??格??冽
        const targetUser = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        if (!targetUser) {
            return res.status(404).json({ error: '?冽銝??? });
        }
        // 甈?瑼Ｘ
        if (currentUser.role === types_1.Role.MANAGER) {
            // MANAGER 銝?蔭 BOSS ?隞?MANAGER ??蝣?            if (targetUser.role === types_1.Role.BOSS || targetUser.role === types_1.Role.MANAGER) {
                return res.status(403).json({ error: '?⊥??身閰脩?嗅?蝣? });
            }
        }
        // ???啣?蝣?        const hashedPassword = await hashPassword(newPassword);
        // ?湔撖Ⅳ
        await db.run('UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?', [hashedPassword, id]);
        // 閮??亥?
        await (0, logger_1.logSystemAction)(db, currentUser, 'RESET_PASSWORD', `?蔭?冽撖Ⅳ: ${targetUser.name} (${targetUser.username})`);
        res.json({ message: '撖Ⅳ?蔭??' });
    }
    catch (error) {
        console.error('?蔭撖Ⅳ?航炊:', error);
        res.status(500).json({ error: '隡箸??典?券隤? });
    }
});
// GET /api/users/department/:departmentId - ?脣??券??冽
router.get('/department/:departmentId', auth_1.authenticateToken, (0, auth_1.requireDepartmentAccess)('departmentId'), async (req, res) => {
    try {
        const db = req.db;
        const { departmentId } = req.params;
        const users = await db.all('SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users WHERE department = ? ORDER BY role DESC, name ASC', [departmentId]);
        const usersWithPermissions = users.map(user => ({
            ...user,
            permissions: user.permissions ? JSON.parse(user.permissions) : undefined
        }));
        res.json(usersWithPermissions);
    }
    catch (error) {
        console.error('?脣??券??冽?航炊:', error);
        res.status(500).json({ error: '隡箸??典?券隤? });
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
            return res.status(400).json({ error: '蝻箏??剖??豢?' });
        }

        // Check permissions
        const isSelf = currentUser.id === id;
        const isBossOrManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';
        const canUpdate = isSelf || isBossOrManager;

        if (!canUpdate) {
            return res.status(403).json({ error: '甈?銝雲' });
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
            return res.status(404).json({ error: '?冽銝??? });
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
        res.status(500).json({ error: '隡箸??典?券隤? });
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
        
        res.json({ success: true, message: '\u5bc6\u78bc\u4fee\u6539\u6210\u529f' });
    } catch (error) {
        console.error('\u4fee\u6539\u5bc6\u78bc\u932f\u8aa4:', error);
        res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
    }
});

//# sourceMappingURL=users.js.map
