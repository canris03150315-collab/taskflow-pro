"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
exports.requireRole = requireRole;
exports.requirePermission = requirePermission;
exports.requireSelfOrAdmin = requireSelfOrAdmin;
exports.requireDepartmentAccess = requireDepartmentAccess;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
// JWT 隤?銝剝?隞?async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json({ error: '蝻箏?隤? Token' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // 敺??澈?脣???啁?嗉?閮?銝縑隞?Token 銝剔?閫嚗?        const db = req.db;
        const userRow = await db.get('SELECT * FROM users WHERE id = ?', [decoded.id]);
        if (!userRow) {
            res.status(401).json({ error: '?冽銝??? });
            return;
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
        req.user = user;
        req.db = db;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({ error: 'Token ?⊥??歇??' });
        }
        else {
            console.error('隤?銝剝?隞園隤?', error);
            res.status(500).json({ error: '隡箸??典?券隤? });
        }
    }
}
// 閫甈?瑼Ｘ銝剝?隞?function requireRole(roles) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: '?芾?霅? });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({ error: '甈?銝雲' });
            return;
        }
        next();
    };
}
// 甈?瑼Ｘ銝剝?隞?function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: '?芾?霅? });
            return;
        }
        // BOSS, MANAGER, SUPERVISOR ?身??憭折????        if (req.user.role === 'BOSS' || req.user.role === 'MANAGER' || req.user.role === 'SUPERVISOR') {
            // SYSTEM_RESET ?芣? BOSS ?身??
            if (permission === 'SYSTEM_RESET' && req.user.role !== 'BOSS') {
                if (!req.user.permissions?.includes(permission)) {
                    res.status(403).json({ error: '?閬摰??? });
                    return;
                }
            }
            next();
            return;
        }
        // ?∪極瑼Ｘ?臬?摰???        if (!req.user.permissions?.includes(permission)) {
            res.status(403).json({ error: '?閬摰??? });
            return;
        }
        next();
    };
}
// ?芸楛?恣?甈?瑼Ｘ
function requireSelfOrAdmin(targetUserIdParam = 'id') {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: '?芾?霅? });
            return;
        }
        const targetUserId = req.params[targetUserIdParam];
        // ?臭誑蝞∠??芸楛
        if (req.user.id === targetUserId) {
            next();
            return;
        }
        // BOSS ??MANAGER ?臭誑蝞∠???犖
        if (req.user.role === 'BOSS' || req.user.role === 'MANAGER') {
            next();
            return;
        }
        // SUPERVISOR ?臭誑蝞∠? EMPLOYEE ???券???SUPERVISOR
        if (req.user.role === 'SUPERVISOR') {
            // ?脣??格??冽鞈?
            req.db?.get('SELECT role, department FROM users WHERE id = ?', [targetUserId])
                .then(targetUser => {
                if (!targetUser) {
                    res.status(404).json({ error: '?格??冽銝??? });
                    return;
                }
                if (targetUser.role === 'EMPLOYEE' ||
                    (targetUser.role === 'SUPERVISOR' && targetUser.department === req.user.department)) {
                    next();
                }
                else {
                    res.status(403).json({ error: '甈?銝雲' });
                }
            })
                .catch(() => {
                res.status(500).json({ error: '隡箸??券隤? });
            });
            return;
        }
        res.status(403).json({ error: '甈?銝雲' });
    };
}
// ?券?甈?瑼Ｘ
function requireDepartmentAccess(departmentIdParam = 'departmentId') {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: '?芾?霅? });
            return;
        }
        const targetDepartmentId = req.params[departmentIdParam] || req.body.departmentId;
        // BOSS ??MANAGER ?臭誑閮芸????
        if (req.user.role === 'BOSS' || req.user.role === 'MANAGER') {
            next();
            return;
        }
        // SUPERVISOR ?芾閮芸??芸楛??
        if (req.user.role === 'SUPERVISOR') {
            if (req.user.department === targetDepartmentId) {
                next();
            }
            else {
                res.status(403).json({ error: '?芾蝞∠??芸楛??' });
            }
            return;
        }
        // EMPLOYEE ?芾閮芸??芸楛??嚗霈嚗?        if (req.user.role === 'EMPLOYEE') {
            if (req.user.department === targetDepartmentId && req.method === 'GET') {
                next();
            }
            else {
                res.status(403).json({ error: '甈?銝雲' });
            }
            return;
        }
        res.status(403).json({ error: '甈?銝雲' });
    };
}
//# sourceMappingURL=auth.js.map
