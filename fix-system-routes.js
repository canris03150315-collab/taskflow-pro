const fs = require('fs');

// 修復 system.js 中的錯誤
const systemRoutes = `const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = express_1.Router();

// POST /api/system/reset-factory - \\u6062\\u5fa9\\u539f\\u5ee0\\u8a2d\\u5b9a
router.post('/reset-factory', auth_1.authenticateToken, async (req, res) => {
    try {
        const currentUser = req.user;
        
        // \\u53ea\\u6709 BOSS \\u53ef\\u4ee5\\u6062\\u5fa9\\u539f\\u5ee0\\u8a2d\\u5b9a
        if (currentUser.role !== 'BOSS') {
            return res.status(403).json({ error: '\\u53ea\\u6709\\u7ba1\\u7406\\u54e1\\u53ef\\u4ee5\\u6062\\u5fa9\\u539f\\u5ee0\\u8a2d\\u5b9a' });
        }
        
        const db = req.db;
        
        console.log('\\u958b\\u59cb\\u6062\\u5fa9\\u539f\\u5ee0\\u8a2d\\u5b9a...');
        
        // \\u7372\\u53d6\\u6240\\u6709\\u8868\\u540d (\\u4f7f\\u7528 prepare().all() \\u800c\\u4e0d\\u662f db.all())
        const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
        const tables = stmt.all();
        
        console.log('\\u627e\\u5230', tables.length, '\\u500b\\u8868');
        
        // \\u522a\\u9664\\u6240\\u6709\\u8868\\u7684\\u6578\\u64da
        for (const table of tables) {
            const tableName = table.name;
            console.log('\\u6e05\\u7a7a\\u8868:', tableName);
            const deleteStmt = db.prepare(\`DELETE FROM \${tableName}\`);
            deleteStmt.run();
        }
        
        // \\u8a18\\u9304\\u65e5\\u8a8c
        try {
            db.logAction(currentUser.id, currentUser.name, 'FACTORY_RESET', '\\u7cfb\\u7d71\\u6062\\u5fa9\\u539f\\u5ee0\\u8a2d\\u5b9a', 'WARNING');
        } catch (error) {
            console.error('\\u8a18\\u9304\\u65e5\\u8a8c\\u5931\\u6557:', error);
        }
        
        console.log('\\u6062\\u5fa9\\u539f\\u5ee0\\u8a2d\\u5b9a\\u5b8c\\u6210');
        
        res.json({ 
            success: true, 
            message: '\\u7cfb\\u7d71\\u5df2\\u6062\\u5fa9\\u539f\\u5ee0\\u8a2d\\u5b9a\\uff0c\\u8acb\\u91cd\\u65b0\\u8a2d\\u5b9a\\u7ba1\\u7406\\u54e1\\u5e33\\u865f' 
        });
    } catch (error) {
        console.error('\\u6062\\u5fa9\\u539f\\u5ee0\\u8a2d\\u5b9a\\u932f\\u8aa4:', error);
        res.status(500).json({ error: '\\u4f3a\\u670d\\u5668\\u5167\\u90e8\\u932f\\u8aa4' });
    }
});

// POST /api/system/backup - \\u5099\\u4efd\\u8cc7\\u6599\\u5eab
router.post('/backup', auth_1.authenticateToken, async (req, res) => {
    try {
        const currentUser = req.user;
        
        if (currentUser.role !== 'BOSS') {
            return res.status(403).json({ error: '\\u53ea\\u6709\\u7ba1\\u7406\\u54e1\\u53ef\\u4ee5\\u5099\\u4efd\\u7cfb\\u7d71' });
        }
        
        const db = req.db;
        const fs = require('fs');
        const path = require('path');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join('/app/data/backups', \`taskflow-backup-\${timestamp}.db\`);
        
        // \\u5099\\u4efd\\u8cc7\\u6599\\u5eab
        db.backup(backupPath);
        
        // \\u8a18\\u9304\\u65e5\\u8a8c
        try {
            db.logAction(currentUser.id, currentUser.name, 'BACKUP', '\\u7cfb\\u7d71\\u5099\\u4efd', 'INFO');
        } catch (error) {
            console.error('\\u8a18\\u9304\\u65e5\\u8a8c\\u5931\\u6557:', error);
        }
        
        res.json({ 
            success: true, 
            message: '\\u5099\\u4efd\\u5b8c\\u6210',
            backupPath 
        });
    } catch (error) {
        console.error('\\u5099\\u4efd\\u932f\\u8aa4:', error);
        res.status(500).json({ error: '\\u4f3a\\u670d\\u5668\\u5167\\u90e8\\u932f\\u8aa4' });
    }
});

exports.systemRoutes = router;
`;

// 寫入文件
fs.writeFileSync('/app/dist/routes/system.js', systemRoutes, 'utf8');
console.log('SUCCESS: System routes fixed');
