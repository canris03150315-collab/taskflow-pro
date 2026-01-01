"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));

var Role;
(function (Role) {
    Role["BOSS"] = "BOSS";
    Role["MANAGER"] = "MANAGER";
    Role["SUPERVISOR"] = "SUPERVISOR";
    Role["EMPLOYEE"] = "EMPLOYEE";
})(Role || (Role = {}));

const router = express_1.default.Router();
exports.authRoutes = router;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 審計日誌輔助函數
const addAuditLog = async (db, log) => {
    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS system_logs (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                user_id TEXT,
                user_name TEXT,
                action TEXT NOT NULL,
                details TEXT,
                level TEXT DEFAULT 'INFO'
            )
        `);
        const id = 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        await db.run(
            `INSERT INTO system_logs (id, timestamp, user_id, user_name, action, details, level) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, new Date().toISOString(), log.userId, log.userName, log.action, log.details, log.level || 'INFO']
        );
    } catch (e) {
        console.error('審計日誌寫入失敗:', e);
    }
};

function generateToken(user) {
    return jsonwebtoken_1.default.sign({
        id: user.id,
        username: user.username,
        role: user.role
    }, JWT_SECRET, { expiresIn: '24h' });
}

async function hashPassword(password) {
    const saltRounds = 12;
    return bcrypt_1.default.hash(password, saltRounds);
}

async function verifyPassword(password, hash) {
    return bcrypt_1.default.compare(password, hash);
}

// POST /api/auth/login - 用戶登入
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: '請提供用戶名和密碼' });
        }
        const db = req.db;
        const userRow = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        
        if (!userRow) {
            // 記錄登入失敗
            await addAuditLog(db, {
                userId: null,
                userName: username,
                action: '登入失敗',
                details: `嘗試登入帳號 ${username} - 用戶不存在`,
                level: 'WARNING'
            });
            return res.status(401).json({ error: '用戶名或密碼錯誤' });
        }
        
        const isValidPassword = await verifyPassword(password, userRow.password);
        if (!isValidPassword) {
            // 記錄密碼錯誤
            await addAuditLog(db, {
                userId: userRow.id,
                userName: userRow.name,
                action: '登入失敗',
                details: `密碼錯誤`,
                level: 'WARNING'
            });
            return res.status(401).json({ error: '用戶名或密碼錯誤' });
        }
        
        const user = {
            id: userRow.id,
            name: userRow.name,
            role: userRow.role,
            department: userRow.department,
            avatar: userRow.avatar,
            username: userRow.username,
            password: userRow.password,
            permissions: userRow.permissions ? JSON.parse(userRow.permissions) : undefined
        };
        
        const token = generateToken(user);
        
        // 記錄登入成功
        await addAuditLog(db, {
            userId: user.id,
            userName: user.name,
            action: '登入系統',
            details: `用戶 ${user.name} 登入成功`,
            level: 'INFO'
        });
        
        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword, token });
    } catch (error) {
        console.error('登入錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// POST /api/auth/verify - 驗證 Token
router.post('/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: '未提供認證令牌' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const db = req.db;
        const userRow = await db.get('SELECT * FROM users WHERE id = ?', [decoded.id]);
        if (!userRow) {
            return res.status(401).json({ error: '用戶不存在' });
        }
        const user = {
            id: userRow.id,
            name: userRow.name,
            role: userRow.role,
            department: userRow.department,
            avatar: userRow.avatar,
            username: userRow.username,
            permissions: userRow.permissions ? JSON.parse(userRow.permissions) : undefined
        };
        res.json({ user });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: '認證令牌已過期' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: '無效的認證令牌' });
        }
        console.error('Token 驗證錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// GET /api/auth/setup/check - 檢查是否需要初始設定
router.get('/setup/check', async (req, res) => {
    try {
        const db = req.db;
        await db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                department TEXT,
                avatar TEXT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                permissions TEXT,
                created_at TEXT,
                updated_at TEXT
            )
        `);
        const result = await db.get('SELECT COUNT(*) as count FROM users');
        const userCount = result?.count || 0;
        res.json({ needsSetup: userCount === 0, userCount });
    } catch (error) {
        console.error('檢查設定錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// POST /api/auth/setup - 初始設定（建立第一個管理員）
router.post('/setup', async (req, res) => {
    try {
        const db = req.db;
        const result = await db.get('SELECT COUNT(*) as count FROM users');
        if (result?.count > 0) {
            return res.status(400).json({ error: '系統已完成初始設定' });
        }
        const { name, username, password, avatar } = req.body;
        if (!name || !username || !password) {
            return res.status(400).json({ error: '請提供必要資訊' });
        }
        const hashedPassword = await hashPassword(password);
        const userId = 'user-' + Date.now();
        const now = new Date().toISOString();
        await db.run(`
            INSERT INTO users (id, name, role, department, avatar, username, password, permissions, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [userId, name, Role.BOSS, 'Management', avatar || '👤', username, hashedPassword, JSON.stringify(['SYSTEM_RESET']), now, now]);
        
        // 記錄系統初始化
        await addAuditLog(db, {
            userId: userId,
            userName: name,
            action: '系統初始化',
            details: `建立管理員帳號 ${username}`,
            level: 'DANGER'
        });
        
        const user = {
            id: userId,
            name,
            role: Role.BOSS,
            department: 'Management',
            avatar: avatar || '👤',
            username,
            permissions: ['SYSTEM_RESET']
        };
        const token = generateToken(user);
        res.json({ user, token, message: '管理員帳號建立成功' });
    } catch (error) {
        console.error('初始設定錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// POST /change-password - 員工修改自己的密碼
router.post('/change-password', async (req, res) => {
    try {
        const db = req.db;
        const { userId, currentPassword, newPassword } = req.body;
        
        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({ error: '請提供完整資訊' });
        }
        
        if (newPassword.length < 4) {
            return res.status(400).json({ error: '新密碼至少需要 4 個字元' });
        }
        
        // 查詢用戶
        const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: '用戶不存在' });
        }
        
        // 驗證舊密碼
        const isValidPassword = await bcrypt_1.default.compare(currentPassword, user.password);
        if (!isValidPassword) {
            // 記錄失敗嘗試
            await addAuditLog(db, {
                userId: userId,
                userName: user.name,
                action: '密碼修改失敗',
                details: '舊密碼驗證失敗',
                level: 'WARNING'
            });
            return res.status(401).json({ error: '舊密碼不正確' });
        }
        
        // 加密新密碼
        const hashedNewPassword = await bcrypt_1.default.hash(newPassword, 10);
        
        // 更新密碼
        await db.run('UPDATE users SET password = ?, updated_at = ? WHERE id = ?', 
            [hashedNewPassword, new Date().toISOString(), userId]);
        
        // 記錄成功
        await addAuditLog(db, {
            userId: userId,
            userName: user.name,
            action: '密碼修改',
            details: '用戶成功修改密碼',
            level: 'INFO'
        });
        
        res.json({ success: true, message: '密碼修改成功' });
    } catch (error) {
        console.error('修改密碼錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
