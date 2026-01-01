#!/bin/bash
echo "=== 修復登入速率限制 ==="

# 建立一個新的 auth.js 文件，加入登入速率限制
docker exec taskflow-pro sh -c 'cat > /app/dist/routes/auth-ratelimit.js << '"'"'AUTHEOF'"'"'
"use strict";
// 登入速率限制模組
// 用於防止暴力破解攻擊

const loginAttempts = new Map(); // IP -> { count, lastAttempt, blockedUntil }

const LOGIN_RATE_LIMIT = {
  maxAttempts: 5,          // 最大嘗試次數
  windowMs: 15 * 60 * 1000, // 15 分鐘視窗
  blockDurationMs: 30 * 60 * 1000, // 封鎖 30 分鐘
};

function getClientIP(req) {
  return req.ip || 
         req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || 
         req.connection?.remoteAddress || 
         "unknown";
}

function checkLoginRateLimit(req) {
  const ip = getClientIP(req);
  const now = Date.now();
  
  let record = loginAttempts.get(ip);
  
  // 清理過期記錄
  if (record && now - record.lastAttempt > LOGIN_RATE_LIMIT.windowMs) {
    loginAttempts.delete(ip);
    record = null;
  }
  
  // 檢查是否被封鎖
  if (record && record.blockedUntil && now < record.blockedUntil) {
    const remainingMs = record.blockedUntil - now;
    const remainingMin = Math.ceil(remainingMs / 60000);
    return {
      allowed: false,
      message: `登入嘗試次數過多，請等待 ${remainingMin} 分鐘後再試`,
      remainingMs
    };
  }
  
  return { allowed: true };
}

function recordLoginAttempt(req, success) {
  const ip = getClientIP(req);
  const now = Date.now();
  
  if (success) {
    // 登入成功，清除記錄
    loginAttempts.delete(ip);
    return;
  }
  
  // 登入失敗，記錄嘗試
  let record = loginAttempts.get(ip);
  
  if (!record || now - record.lastAttempt > LOGIN_RATE_LIMIT.windowMs) {
    record = { count: 0, lastAttempt: now, blockedUntil: null };
  }
  
  record.count++;
  record.lastAttempt = now;
  
  // 超過限制，封鎖 IP
  if (record.count >= LOGIN_RATE_LIMIT.maxAttempts) {
    record.blockedUntil = now + LOGIN_RATE_LIMIT.blockDurationMs;
    console.log(`[安全] IP ${ip} 因多次登入失敗被封鎖 30 分鐘`);
  }
  
  loginAttempts.set(ip, record);
}

// 定期清理過期記錄（每小時）
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of loginAttempts.entries()) {
    if (now - record.lastAttempt > LOGIN_RATE_LIMIT.windowMs * 2) {
      loginAttempts.delete(ip);
    }
  }
}, 60 * 60 * 1000);

module.exports = { checkLoginRateLimit, recordLoginAttempt };
AUTHEOF'

echo "✓ 速率限制模組已建立"

# 取得現有的 auth.js 並修改
docker exec taskflow-pro sh -c 'cat /app/dist/routes/auth.js' > /tmp/auth-original.js

# 建立修補後的 auth.js
cat > /tmp/auth-patched.js << 'PATCHEOF'
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));

// 引入速率限制模組
const { checkLoginRateLimit, recordLoginAttempt } = require("./auth-ratelimit");

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
        role: user.role,
        department: user.department
    }, JWT_SECRET, { expiresIn: '24h' });
}

// 登入路由 - 加入速率限制
router.post('/login', async (req, res) => {
    // 檢查速率限制
    const rateLimitCheck = checkLoginRateLimit(req);
    if (!rateLimitCheck.allowed) {
        return res.status(429).json({ error: rateLimitCheck.message });
    }

    const { username, password } = req.body;
    const db = req.db;

    if (!username || !password) {
        recordLoginAttempt(req, false);
        return res.status(401).json({ error: '請輸入帳號和密碼' });
    }

    try {
        const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);

        if (!user) {
            recordLoginAttempt(req, false);
            await addAuditLog(db, {
                userId: null,
                userName: username,
                action: '登入失敗',
                details: '帳號不存在',
                level: 'WARNING'
            });
            return res.status(401).json({ error: '帳號或密碼錯誤' });
        }

        const validPassword = await bcrypt_1.default.compare(password, user.password);

        if (!validPassword) {
            recordLoginAttempt(req, false);
            await addAuditLog(db, {
                userId: user.id,
                userName: user.name,
                action: '登入失敗',
                details: '密碼錯誤',
                level: 'WARNING'
            });
            return res.status(401).json({ error: '帳號或密碼錯誤' });
        }

        // 登入成功
        recordLoginAttempt(req, true);
        const token = generateToken(user);

        await addAuditLog(db, {
            userId: user.id,
            userName: user.name,
            action: '登入成功',
            details: `IP: ${req.ip || 'unknown'}`,
            level: 'INFO'
        });

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                department: user.department,
                avatar: user.avatar,
                username: user.username,
                permissions: user.permissions ? JSON.parse(user.permissions) : null
            }
        });
    } catch (error) {
        console.error('登入錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// 設置檢查
router.get('/setup/check', async (req, res) => {
    const db = req.db;
    try {
        const users = await db.all('SELECT id FROM users LIMIT 1');
        res.json({ needsSetup: !users || users.length === 0 });
    } catch (error) {
        res.json({ needsSetup: true });
    }
});

// 初始設置
router.post('/setup', async (req, res) => {
    const db = req.db;
    const { name, username, password, avatar } = req.body;

    try {
        const existingUsers = await db.all('SELECT id FROM users LIMIT 1');
        if (existingUsers && existingUsers.length > 0) {
            return res.status(400).json({ error: '系統已經設置完成' });
        }

        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const userId = 'admin-' + Date.now();

        // 確保 Management 部門存在
        await db.run(`INSERT OR IGNORE INTO departments (id, name, theme, icon) VALUES (?, ?, ?, ?)`,
            ['Management', '管理部', 'slate', '🏢']);

        await db.run(
            `INSERT INTO users (id, name, role, department, avatar, username, password) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, name, 'BOSS', 'Management', avatar || '', username, hashedPassword]
        );

        const token = generateToken({
            id: userId,
            username,
            role: 'BOSS',
            department: 'Management'
        });

        await addAuditLog(db, {
            userId,
            userName: name,
            action: '系統初始設置',
            details: '建立管理員帳號',
            level: 'INFO'
        });

        res.json({
            token,
            user: {
                id: userId,
                name,
                role: 'BOSS',
                department: 'Management',
                avatar: avatar || '',
                username
            }
        });
    } catch (error) {
        console.error('設置錯誤:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});
PATCHEOF

# 複製到容器
docker cp /tmp/auth-patched.js taskflow-pro:/app/dist/routes/auth.js

echo "✓ auth.js 已更新（含速率限制）"

# 重啟容器
docker restart taskflow-pro
sleep 3

echo "=== 完成 ==="
echo "速率限制設定："
echo "  - 最大嘗試次數: 5 次"
echo "  - 時間視窗: 15 分鐘"
echo "  - 封鎖時間: 30 分鐘"
