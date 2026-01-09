"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();

// Database adapter
const dbCall = (db, method, ...args) => {
    if (typeof db[method] === 'function') {
        return db[method](...args);
    }
    throw new Error(`Database method ${method} not found`);
};

// GET /api/memos - \u7372\u53d6\u7576\u524d\u7528\u6236\u7684\u6240\u6709\u5099\u5fd8\u9304
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        
        const memos = await dbCall(db, 'all', 
            'SELECT * FROM memos WHERE user_id = ? ORDER BY created_at DESC',
            [currentUser.id]
        );
        
        res.json(memos || []);
    } catch (error) {
        console.error('Get memos error:', error);
        res.status(500).json({ error: '\u7372\u53d6\u5099\u5fd8\u9304\u5931\u6557' });
    }
});

// POST /api/memos - \u65b0\u589e\u5099\u5fd8\u9304
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { title, content, color } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: '\u8acb\u63d0\u4f9b\u6a19\u984c\u548c\u5167\u5bb9' });
        }
        
        const memoId = `memo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        
        await dbCall(db, 'run',
            'INSERT INTO memos (id, user_id, title, content, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [memoId, currentUser.id, title, content, color || '#fef3c7', now, now]
        );
        
        const newMemo = await dbCall(db, 'get',
            'SELECT * FROM memos WHERE id = ?',
            [memoId]
        );
        
        res.status(201).json(newMemo);
    } catch (error) {
        console.error('Create memo error:', error);
        res.status(500).json({ error: '\u65b0\u589e\u5099\u5fd8\u9304\u5931\u6557' });
    }
});

// PUT /api/memos/:id - \u66f4\u65b0\u5099\u5fd8\u9304
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        const { title, content, color } = req.body;
        
        // \u6aa2\u67e5\u5099\u5fd8\u9304\u662f\u5426\u5b58\u5728\u4e14\u5c6c\u65bc\u7576\u524d\u7528\u6236
        const memo = await dbCall(db, 'get',
            'SELECT * FROM memos WHERE id = ?',
            [id]
        );
        
        if (!memo) {
            return res.status(404).json({ error: '\u5099\u5fd8\u9304\u4e0d\u5b58\u5728' });
        }
        
        if (memo.user_id !== currentUser.id) {
            return res.status(403).json({ error: '\u7121\u6b0a\u4fee\u6539\u6b64\u5099\u5fd8\u9304' });
        }
        
        const now = new Date().toISOString();
        
        await dbCall(db, 'run',
            'UPDATE memos SET title = ?, content = ?, color = ?, updated_at = ? WHERE id = ?',
            [title || memo.title, content || memo.content, color || memo.color, now, id]
        );
        
        const updatedMemo = await dbCall(db, 'get',
            'SELECT * FROM memos WHERE id = ?',
            [id]
        );
        
        res.json(updatedMemo);
    } catch (error) {
        console.error('Update memo error:', error);
        res.status(500).json({ error: '\u66f4\u65b0\u5099\u5fd8\u9304\u5931\u6557' });
    }
});

// DELETE /api/memos/:id - \u522a\u9664\u5099\u5fd8\u9304
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        
        // \u6aa2\u67e5\u5099\u5fd8\u9304\u662f\u5426\u5b58\u5728\u4e14\u5c6c\u65bc\u7576\u524d\u7528\u6236
        const memo = await dbCall(db, 'get',
            'SELECT * FROM memos WHERE id = ?',
            [id]
        );
        
        if (!memo) {
            return res.status(404).json({ error: '\u5099\u5fd8\u9304\u4e0d\u5b58\u5728' });
        }
        
        if (memo.user_id !== currentUser.id) {
            return res.status(403).json({ error: '\u7121\u6b0a\u522a\u9664\u6b64\u5099\u5fd8\u9304' });
        }
        
        await dbCall(db, 'run',
            'DELETE FROM memos WHERE id = ?',
            [id]
        );
        
        res.json({ success: true, message: '\u5099\u5fd8\u9304\u5df2\u522a\u9664' });
    } catch (error) {
        console.error('Delete memo error:', error);
        res.status(500).json({ error: '\u522a\u9664\u5099\u5fd8\u9304\u5931\u6557' });
    }
});

exports.memoRoutes = router;
