#!/bin/bash

# 創建 announcements.js
cat > /app/dist/routes/announcements.js << 'EOF'
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.announcementsRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = express_1.Router();
exports.announcementsRoutes = router;

router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const announcements = await db.all('SELECT * FROM announcements ORDER BY created_at DESC');
        for (const a of announcements) {
            a.read_by = JSON.parse(a.read_by || '[]');
            a.readBy = a.read_by;
        }
        res.json({ announcements });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { title, content, priority } = req.body;
        const id = 'announcement-' + Date.now();
        const now = new Date().toISOString();
        await db.run('INSERT INTO announcements (id, title, content, priority, created_at, created_by, read_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, title, content, priority || 'NORMAL', now, currentUser.id, '[]']);
        const announcement = await db.get('SELECT * FROM announcements WHERE id = ?', [id]);
        announcement.readBy = [];
        res.json({ announcement });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id/read', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        const announcement = await db.get('SELECT read_by FROM announcements WHERE id = ?', [id]);
        if (!announcement) return res.status(404).json({ error: 'Not found' });
        const readBy = JSON.parse(announcement.read_by || '[]');
        if (!readBy.includes(currentUser.id)) {
            readBy.push(currentUser.id);
            await db.run('UPDATE announcements SET read_by = ? WHERE id = ?', [JSON.stringify(readBy), id]);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
EOF

# 創建 system.js
cat > /app/dist/routes/system.js << 'EOF'
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = express_1.Router();
exports.systemRoutes = router;

router.get('/settings', auth_1.authenticateToken, async (req, res) => {
    res.json({ settings: { companyName: 'TaskFlow Pro', allowRegistration: false } });
});

router.get('/version', async (req, res) => {
    res.json({ version: '2.0.2' });
});
EOF

# 更新 forum.js
cat > /app/dist/routes/forum.js << 'EOF'
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
EOF

# 更新 reports.js
cat > /app/dist/routes/reports.js << 'EOF'
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportsRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = express_1.Router();
exports.reportsRoutes = router;

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

echo "Routes created successfully!"
