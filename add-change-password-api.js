const fs = require('fs');

const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

// 找到 exports.usersRoutes = router; 之前插入新路由
const exportPattern = /exports\.usersRoutes = router;/;

const changePasswordRoute = `
// POST /api/users/:id/change-password - \\u4fee\\u6539\\u5bc6\\u78bc
router.post('/:id/change-password', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;
        const currentUser = req.user;
        
        // \\u53ea\\u80fd\\u4fee\\u6539\\u81ea\\u5df1\\u7684\\u5bc6\\u78bc
        if (currentUser.id !== id) {
            return res.status(403).json({ error: '\\u7121\\u6b0a\\u4fee\\u6539\\u4ed6\\u4eba\\u5bc6\\u78bc' });
        }
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: '\\u8acb\\u63d0\\u4f9b\\u76ee\\u524d\\u5bc6\\u78bc\\u548c\\u65b0\\u5bc6\\u78bc' });
        }
        
        if (newPassword.length < 4) {
            return res.status(400).json({ error: '\\u65b0\\u5bc6\\u78bc\\u81f3\\u5c11\\u9700\\u8981 4 \\u500b\\u5b57\\u5143' });
        }
        
        const db = req.db;
        
        // \\u7372\\u53d6\\u7528\\u6236
        const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        if (!user) {
            return res.status(404).json({ error: '\\u7528\\u6236\\u4e0d\\u5b58\\u5728' });
        }
        
        // \\u9a57\\u8b49\\u76ee\\u524d\\u5bc6\\u78bc
        const bcrypt = require('bcrypt');
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return res.status(401).json({ error: '\\u76ee\\u524d\\u5bc6\\u78bc\\u4e0d\\u6b63\\u78ba' });
        }
        
        // \\u52a0\\u5bc6\\u65b0\\u5bc6\\u78bc
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        // \\u66f4\\u65b0\\u5bc6\\u78bc
        await db.run('UPDATE users SET password = ?, updated_at = datetime(\\'now\\') WHERE id = ?', [hashedPassword, id]);
        
        // \\u8a18\\u9304\\u65e5\\u8a8c
        try {
            db.logAction(user.id, user.name, 'CHANGE_PASSWORD', '\\u7528\\u6236\\u4fee\\u6539\\u5bc6\\u78bc', 'INFO');
        } catch (error) {
            console.error('\\u8a18\\u9304\\u5bc6\\u78bc\\u4fee\\u6539\\u65e5\\u8a8c\\u5931\\u6557:', error);
        }
        
        res.json({ success: true, message: '\\u5bc6\\u78bc\\u4fee\\u6539\\u6210\\u529f' });
    } catch (error) {
        console.error('\\u4fee\\u6539\\u5bc6\\u78bc\\u932f\\u8aa4:', error);
        res.status(500).json({ error: '\\u4f3a\\u670d\\u5668\\u5167\\u90e8\\u932f\\u8aa4' });
    }
});

exports.usersRoutes = router;`;

if (content.match(exportPattern)) {
  content = content.replace(exportPattern, changePasswordRoute);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Change password API added');
} else {
  console.log('ERROR: Could not find exports.usersRoutes pattern');
  process.exit(1);
}
