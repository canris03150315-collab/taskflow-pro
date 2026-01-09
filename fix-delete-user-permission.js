const fs = require('fs');

const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

// 找到 DELETE /:id 路由並替換權限邏輯
const oldDeleteRoute = /router\.delete\('\/:id', auth_1\.authenticateToken, \(0, auth_1\.requireRole\)\(\[types_1\.Role\.BOSS, types_1\.Role\.MANAGER\]\), async \(req, res\) => \{[\s\S]*?\/\/ \\u4e0d\\u80fd\\u522a\\u9664\\u81ea\\u5df1/;

const newDeleteRoute = `router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const { id } = req.params;
        
        // \\u4e0d\\u80fd\\u522a\\u9664\\u81ea\\u5df1`;

if (content.match(oldDeleteRoute)) {
    content = content.replace(oldDeleteRoute, newDeleteRoute);
    
    // 替換權限檢查邏輯
    const oldPermissionCheck = /\/\/ \\u6b0a\\u9650\\u6aa2\\u67e5[\s\S]*?if \(currentUser\.role === types_1\.Role\.MANAGER\) \{[\s\S]*?\}\s*\}/;
    
    const newPermissionCheck = `// \\u6b0a\\u9650\\u6aa2\\u67e5: \\u9700\\u8981\\u4fee\\u6539\\u4eba\\u54e1\\u6b0a\\u9650
        const permissions = currentUser.permissions ? JSON.parse(currentUser.permissions) : [];
        const hasPersonnelPermission = permissions.includes('personnel');
        
        // BOSS \\u53ef\\u4ee5\\u522a\\u9664\\u4efb\\u4f55\\u4eba
        const isBoss = currentUser.role === 'BOSS';
        
        if (!isBoss && !hasPersonnelPermission) {
            return res.status(403).json({ error: '\\u7121\\u6b0a\\u522a\\u9664\\u54e1\\u5de5\\uff0c\\u9700\\u8981\\u4fee\\u6539\\u4eba\\u54e1\\u6b0a\\u9650' });
        }
        
        // \\u975e BOSS \\u53ea\\u80fd\\u522a\\u9664\\u81ea\\u5df1\\u90e8\\u9580\\u7684\\u54e1\\u5de5
        if (!isBoss && userToDelete.department !== currentUser.department) {
            return res.status(403).json({ error: '\\u53ea\\u80fd\\u522a\\u9664\\u81ea\\u5df1\\u90e8\\u9580\\u7684\\u54e1\\u5de5' });
        }
        
        // \\u4efb\\u4f55\\u4eba\\u90fd\\u4e0d\\u80fd\\u522a\\u9664 BOSS
        if (userToDelete.role === 'BOSS') {
            return res.status(403).json({ error: '\\u7121\\u6b0a\\u522a\\u9664 BOSS \\u5e33\\u865f' });
        }`;
    
    content = content.replace(oldPermissionCheck, newPermissionCheck);
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Delete user permission logic updated');
} else {
    console.log('ERROR: Could not find DELETE route pattern');
    process.exit(1);
}
