"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Role 枚舉定義
var Role;
(function (Role) {
    Role["BOSS"] = "BOSS";
    Role["MANAGER"] = "MANAGER";
    Role["SUPERVISOR"] = "SUPERVISOR";
    Role["EMPLOYEE"] = "EMPLOYEE";
})(Role || (Role = {}));
const router = express_1.default.Router();

// S9 fix: Brute-force login protection (in-memory, per username)
const loginFailures = new Map(); // username -> { count, lockedUntil }
const MAX_FAILURES = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function checkLoginAllowed(username) {
    const entry = loginFailures.get(username);
    if (!entry) return { allowed: true };
    if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
        const remainingMs = entry.lockedUntil - Date.now();
        const remainingMin = Math.ceil(remainingMs / 60000);
        return { allowed: false, remainingMin };
    }
    return { allowed: true };
}

function recordLoginFailure(username) {
    const entry = loginFailures.get(username) || { count: 0, lockedUntil: null };
    entry.count += 1;
    if (entry.count >= MAX_FAILURES) {
        entry.lockedUntil = Date.now() + LOCK_DURATION_MS;
    }
    loginFailures.set(username, entry);
}

function clearLoginFailures(username) {
    loginFailures.delete(username);
}

// GET /api/auth/setup/check - ?????????????????
router.get('/setup/check', async (req, res) => {
  try {
    const db = req.db;
    const result = await db.get('SELECT COUNT(*) as count FROM users');
    res.json({
      needsSetup: result.count === 0,
      userCount: result.count
    });
  } catch (error) {
    console.error('Setup check error:', error);
    res.status(500).json({ error: error.message });
  }
});

exports.authRoutes = router;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
// JWT Token 生成
function generateToken(user) {
    return jsonwebtoken_1.default.sign({
        id: user.id,
        username: user.username,
        role: user.role
    }, JWT_SECRET, { expiresIn: '24h' });
}
// 密碼加密
async function hashPassword(password) {
    const saltRounds = 12;
    return bcrypt_1.default.hash(password, saltRounds);
}
// 密碼驗證
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

        // S9 fix: Check brute-force lock
        const lockCheck = checkLoginAllowed(username);
        if (!lockCheck.allowed) {
            return res.status(429).json({ error: `帳號已鎖定，請 ${lockCheck.remainingMin} 分鐘後再試` });
        }

        const db = req.db;
        // 查找用戶
        const userRow = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        if (!userRow) {
            recordLoginFailure(username);
            return res.status(401).json({ error: '用戶名或密碼錯誤' });
        }
        // 驗證密碼
        const isValidPassword = await verifyPassword(password, userRow.password);
        if (!isValidPassword) {
            recordLoginFailure(username);
            return res.status(401).json({ error: '用戶名或密碼錯誤' });
        }
        clearLoginFailures(username);
        // 建構用戶物件
        const user = {
            id: userRow.id,
            name: userRow.name,
            role: userRow.role,
            department: userRow.department,
            avatar: userRow.avatar,
            username: userRow.username,
            password: userRow.password, // 實際應用中不應返回密碼
            permissions: userRow.permissions ? JSON.parse(userRow.permissions) : undefined
        };
        // 生成 JWT Token
        const token = generateToken(user);
        // 記錄登入日誌
        try {
            db.logAction(user.id, user.name, 'LOGIN', '用戶登入系統', 'INFO');
        }
        catch (error) {
            console.error('記錄登入日誌失敗:', error);
        }
        // 返回用戶資訊和 Token（不包含密碼）
        const { password: _, ...userWithoutPassword } = user;
        res.json({
            user: userWithoutPassword,
            token
        });
    }
    catch (error) {
        console.error('登入錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
// POST /api/auth/setup - 系統初始化設定
router.post('/setup', async (req, res) => {
    try {
        const { username, password, name, department } = req.body;
        if (!username || !password || !name) {
            return res.status(400).json({
                error: '請提供完整的初始化資訊（用戶名、密碼、姓名）'
            });
        }
        const db = req.db;
        // 檢查是否已經有用戶（防止重複初始化）
        const existingUsers = await db.get('SELECT COUNT(*) as count FROM users');
        if (existingUsers.count > 0) {
            return res.status(403).json({
                error: '系統已初始化，無法重複設定'
            });
        }
        // 檢查用戶名是否已存在
        const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser) {
            return res.status(400).json({ error: '用戶名已存在' });
        }
        // 檢查部門是否存在
        const deptExists = await db.get('SELECT id FROM departments WHERE id = ?', [department || 'Management']);
        if (!deptExists) {
            return res.status(400).json({ error: '指定的部門不存在' });
        }
        // 加密密碼
        const hashedPassword = await hashPassword(password);
        // 創建管理員用戶
        const adminUser = {
            id: `admin-${Date.now()}`,
            name,
            role: Role.BOSS,
            department: department || 'Management',
            avatar: '',
            username,
            password: hashedPassword,
            permissions: undefined
        };
        // 插入用戶
        await db.run(`INSERT INTO users (id, name, role, department, avatar, username, password, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, [
            adminUser.id,
            adminUser.name,
            adminUser.role,
            adminUser.department,
            adminUser.avatar,
            adminUser.username,
            adminUser.password
        ]);
        // 生成 JWT Token
        const token = generateToken(adminUser);
        // 返回用戶資訊和 Token（不包含密碼）
        const { password: _, ...userWithoutPassword } = adminUser;
        console.log(`✅ 系統初始化完成 - 管理員: ${adminUser.name} (${adminUser.username})`);
        res.json({
            user: userWithoutPassword,
            token,
            message: '系統初始化成功'
        });
    }
    catch (error) {
        console.error('初始化錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
// POST /api/auth/verify - 驗證 Token
router.post('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: '缺少認證 Token' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const db = req.db;
        // 獲取最新用戶資訊
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
            password: userRow.password,
            permissions: userRow.permissions ? JSON.parse(userRow.permissions) : undefined
        };
        const { password: _, ...userWithoutPassword } = user;
        res.json({
            valid: true,
            user: userWithoutPassword
        });
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({ error: 'Token 無效或已過期' });
        }
        console.error('Token 驗證錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
// POST /api/auth/change-password - 修改密碼
router.post('/change-password', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: '缺少認證 Token' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: '請提供當前密碼和新密碼' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: '新密碼長度至少需要 6 個字元' });
        }
        const db = req.db;
        // 獲取用戶資訊
        const userRow = await db.get('SELECT * FROM users WHERE id = ?', [decoded.id]);
        if (!userRow) {
            return res.status(401).json({ error: '用戶不存在' });
        }
        // 驗證當前密碼
        const isValidPassword = await verifyPassword(currentPassword, userRow.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: '當前密碼錯誤' });
        }
        // 加密新密碼
        const hashedNewPassword = await hashPassword(newPassword);
        // 更新密碼
        await db.run('UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?', [hashedNewPassword, decoded.id]);
        // 記錄日誌
        try {
            db.logAction(userRow.id, userRow.name, 'CHANGE_PASSWORD', '用戶修改密碼', 'INFO');
        }
        catch (error) {
            console.error('記錄密碼修改日誌失敗:', error);
        }
        res.json({ message: '密碼修改成功' });
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({ error: 'Token 無效或已過期' });
        }
        console.error('修改密碼錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
//# sourceMappingURL=auth.js.map