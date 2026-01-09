#!/bin/bash

# 修復 reports.js - 導出名稱要是 reportRoutes (不是 reportsRoutes)
cat > /app/dist/routes/reports.js << 'EOF'
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = express_1.Router();
exports.reportRoutes = router;

router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        let reports;
        if (currentUser.role === 'EMPLOYEE') {
            reports = await db.all('SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [currentUser.id]);
        } else {
            reports = await db.all('SELECT * FROM reports ORDER BY created_at DESC LIMIT 50');
        }
        for (const r of reports) {
            try { r.content = JSON.parse(r.content || '{}'); } catch(e) { r.content = {}; }
        }
        res.json({ reports });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { type, content } = req.body;
        const id = 'report-' + Date.now();
        const now = new Date().toISOString();
        await db.run('INSERT INTO reports (id, type, user_id, created_at, content) VALUES (?, ?, ?, ?, ?)',
            [id, type || 'DAILY', currentUser.id, now, JSON.stringify(content)]);
        const report = await db.get('SELECT * FROM reports WHERE id = ?', [id]);
        report.content = JSON.parse(report.content);
        res.json({ report });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
EOF

# 修復 memos.js - 導出名稱要是 memoRoutes
cat > /app/dist/routes/memos.js << 'EOF'
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = express_1.Router();
exports.memoRoutes = router;

router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const memos = await db.all('SELECT * FROM memos WHERE user_id = ? ORDER BY created_at DESC', [currentUser.id]);
        for (const m of memos) {
            try { m.todos = JSON.parse(m.todos || '[]'); } catch(e) { m.todos = []; }
        }
        res.json({ memos });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { type, content, todos, color } = req.body;
        const id = 'memo-' + Date.now();
        const now = new Date().toISOString();
        await db.run('INSERT INTO memos (id, user_id, type, content, todos, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, currentUser.id, type || 'TEXT', content || '', JSON.stringify(todos || []), color || 'yellow', now]);
        const memo = await db.get('SELECT * FROM memos WHERE id = ?', [id]);
        memo.todos = JSON.parse(memo.todos || '[]');
        res.json({ memo });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const { id } = req.params;
        const { content, todos, color } = req.body;
        await db.run('UPDATE memos SET content = ?, todos = ?, color = ? WHERE id = ?',
            [content || '', JSON.stringify(todos || []), color || 'yellow', id]);
        const memo = await db.get('SELECT * FROM memos WHERE id = ?', [id]);
        memo.todos = JSON.parse(memo.todos || '[]');
        res.json({ memo });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const { id } = req.params;
        await db.run('DELETE FROM memos WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
EOF

# 修復 performance.js - 導出名稱要是 performanceRoutes
cat > /app/dist/routes/performance.js << 'EOF'
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = express_1.Router();
exports.performanceRoutes = router;

router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const reviews = await db.all('SELECT * FROM performance_reviews ORDER BY updated_at DESC');
        res.json({ reviews });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
EOF

echo "Exports fixed!"
