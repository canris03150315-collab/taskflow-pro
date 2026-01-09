const fs = require('fs');

const filePath = '/app/dist/routes/tasks.js';
let content = fs.readFileSync(filePath, 'utf8');

// 在 exports 之前添加 DELETE 路由
const exportsPattern = /exports\.taskRoutes = router;/;

const deleteRoute = `// DELETE /:id - \\u522a\\u9664\\u4efb\\u52d9
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        const db = req.db;
        
        // \\u7372\\u53d6\\u4efb\\u52d9
        const task = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
        
        if (!task) {
            return res.status(404).json({ error: '\\u4efb\\u52d9\\u4e0d\\u5b58\\u5728' });
        }
        
        // \\u6b0a\\u9650\\u6aa2\\u67e5: BOSS \\u53ef\\u4ee5\\u522a\\u9664\\u4efb\\u4f55\\u4efb\\u52d9\\uff0c\\u5176\\u4ed6\\u4eba\\u53ea\\u80fd\\u522a\\u9664\\u81ea\\u5df1\\u5275\\u5efa\\u7684
        if (currentUser.role !== 'BOSS' && task.created_by !== currentUser.id) {
            return res.status(403).json({ error: '\\u7121\\u6b0a\\u522a\\u9664\\u6b64\\u4efb\\u52d9' });
        }
        
        // \\u522a\\u9664\\u4efb\\u52d9
        await db.run('DELETE FROM tasks WHERE id = ?', [id]);
        
        // \\u8a18\\u9304\\u65e5\\u8a8c
        try {
            await db.logAction(currentUser.id, currentUser.name, 'DELETE_TASK', \`\\u522a\\u9664\\u4efb\\u52d9: \${task.title}\`, 'INFO');
        } catch (error) {
            console.error('\\u8a18\\u9304\\u65e5\\u8a8c\\u5931\\u6557:', error);
        }
        
        res.json({ success: true, message: '\\u4efb\\u52d9\\u5df2\\u522a\\u9664' });
    } catch (error) {
        console.error('\\u522a\\u9664\\u4efb\\u52d9\\u932f\\u8aa4:', error);
        res.status(500).json({ error: '\\u4f3a\\u670d\\u5668\\u5167\\u90e8\\u932f\\u8aa4' });
    }
});

exports.taskRoutes = router;`;

if (content.match(exportsPattern)) {
    content = content.replace(exportsPattern, deleteRoute);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: DELETE task route added');
} else {
    console.log('ERROR: Could not find exports pattern');
    process.exit(1);
}
