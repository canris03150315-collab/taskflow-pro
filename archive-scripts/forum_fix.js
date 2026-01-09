"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forumRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = express_1.Router();
exports.forumRoutes = router;

router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const suggestions = await db.all('SELECT * FROM suggestions ORDER BY created_at DESC');
        for (const s of suggestions) {
            s.upvotes = JSON.parse(s.upvotes || '[]');
            const comments = await db.all('SELECT * FROM suggestion_comments WHERE suggestion_id = ? ORDER BY created_at', [s.id]);
            s.comments = comments;
        }
        res.json({ suggestions });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { title, content, category, is_anonymous } = req.body;
        const id = 'suggestion-' + Date.now();
        const now = new Date().toISOString();
        await db.run('INSERT INTO suggestions (id, title, content, category, is_anonymous, author_id, status, upvotes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, title, content, category, is_anonymous ? 1 : 0, currentUser.id, 'OPEN', '[]', now]);
        const suggestion = await db.get('SELECT * FROM suggestions WHERE id = ?', [id]);
        suggestion.upvotes = [];
        suggestion.comments = [];
        res.json({ suggestion });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 更新提案 (附議、狀態更新等)
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const { id } = req.params;
        const { status, upvotes } = req.body;
        
        const updates = [];
        const params = [];
        
        if (status !== undefined) {
            updates.push('status = ?');
            params.push(status);
        }
        if (upvotes !== undefined) {
            updates.push('upvotes = ?');
            params.push(JSON.stringify(upvotes));
        }
        
        if (updates.length > 0) {
            params.push(id);
            await db.run(`UPDATE suggestions SET ${updates.join(', ')} WHERE id = ?`, params);
        }
        
        const suggestion = await db.get('SELECT * FROM suggestions WHERE id = ?', [id]);
        if (suggestion) {
            suggestion.upvotes = JSON.parse(suggestion.upvotes || '[]');
            const comments = await db.all('SELECT * FROM suggestion_comments WHERE suggestion_id = ? ORDER BY created_at', [id]);
            suggestion.comments = comments;
        }
        
        res.json({ suggestion });
    } catch (error) {
        console.error('Error updating suggestion:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 新增評論 - 使用 user_id 而非 author_id
router.post('/:id/comments', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        const { content, isOfficial } = req.body;
        
        const commentId = 'comment-' + Date.now();
        const now = new Date().toISOString();
        
        // 確保資料表有所需欄位
        try {
            await db.run("ALTER TABLE suggestion_comments ADD COLUMN user_id TEXT");
        } catch (e) {}
        try {
            await db.run("ALTER TABLE suggestion_comments ADD COLUMN is_official INTEGER DEFAULT 0");
        } catch (e) {}
        
        await db.run('INSERT INTO suggestion_comments (id, suggestion_id, user_id, content, is_official, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [commentId, id, currentUser.id, content, isOfficial ? 1 : 0, now]);
        
        const comment = await db.get('SELECT * FROM suggestion_comments WHERE id = ?', [commentId]);
        console.log('評論新增成功:', commentId);
        res.json({ comment });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});
