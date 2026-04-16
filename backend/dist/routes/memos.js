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
        
        // \u8f49\u63db\u70ba\u524d\u7aef\u683c\u5f0f
        const formattedMemos = (memos || []).map(m => {
            const memo = {
                id: m.id,
                userId: m.user_id,
                type: m.type || 'TEXT',
                color: m.color || '#fef3c7',
                createdAt: m.created_at
            };
            
            if (m.content) {
                memo.content = m.content;
            }
            
            if (m.todos) {
                try {
                    memo.todos = JSON.parse(m.todos);
                } catch (e) {
                    memo.todos = [];
                }
            }
            
            return memo;
        });
        
        res.json({ memos: formattedMemos });
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
        const { type, content, todos, color } = req.body;
        
        // \u9a57\u8b49\uff1a\u5fc5\u9808\u6709 content \u6216 todos
        if (!content && (!todos || todos.length === 0)) {
            return res.status(400).json({ error: '\u8acb\u63d0\u4f9b\u5167\u5bb9\u6216\u5f85\u8fa6\u4e8b\u9805' });
        }
        
        const memoId = `memo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        
        // \u5c07 todos \u8f49\u63db\u70ba JSON \u5b57\u4e32
        const todosJson = todos ? JSON.stringify(todos) : null;
        
        await dbCall(db, 'run',
            'INSERT INTO memos (id, user_id, type, content, todos, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [memoId, currentUser.id, type || 'TEXT', content || null, todosJson, color || '#fef3c7', now, now]
        );
        
        const newMemo = await dbCall(db, 'get',
            'SELECT * FROM memos WHERE id = ?',
            [memoId]
        );
        
        // \u8f49\u63db\u70ba\u524d\u7aef\u683c\u5f0f
        const formattedMemo = {
            id: newMemo.id,
            userId: newMemo.user_id,
            type: newMemo.type || 'TEXT',
            color: newMemo.color || '#fef3c7',
            createdAt: newMemo.created_at
        };
        
        if (newMemo.content) {
            formattedMemo.content = newMemo.content;
        }
        
        if (newMemo.todos) {
            try {
                formattedMemo.todos = JSON.parse(newMemo.todos);
            } catch (e) {
                formattedMemo.todos = [];
            }
        }
        
        // Broadcast WebSocket event

        
        if (req.wsServer) {

        
            req.wsServer.broadcastToAll('MEMO_CREATED', {

        
                timestamp: new Date().toISOString()

        
            });

        
        }

        
        res.status(201).json(formattedMemo);
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
        const { type, content, todos, color } = req.body;
        
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
        const todosJson = todos ? JSON.stringify(todos) : memo.todos;
        
        await dbCall(db, 'run',
            'UPDATE memos SET type = ?, content = ?, todos = ?, color = ?, updated_at = ? WHERE id = ?',
            [type || memo.type, content !== undefined ? content : memo.content, todosJson, color || memo.color, now, id]
        );
        
        const updatedMemo = await dbCall(db, 'get',
            'SELECT * FROM memos WHERE id = ?',
            [id]
        );
        
        // \u8f49\u63db\u70ba\u524d\u7aef\u683c\u5f0f
        const formattedMemo = {
            id: updatedMemo.id,
            userId: updatedMemo.user_id,
            type: updatedMemo.type || 'TEXT',
            color: updatedMemo.color || '#fef3c7',
            createdAt: updatedMemo.created_at
        };
        
        if (updatedMemo.content) {
            formattedMemo.content = updatedMemo.content;
        }
        
        if (updatedMemo.todos) {
            try {
                formattedMemo.todos = JSON.parse(updatedMemo.todos);
            } catch (e) {
                formattedMemo.todos = [];
            }
        }
        
        res.json(formattedMemo);
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

