const fs = require('fs');
const { execSync } = require('child_process');

try {
    // 先備份原文件
    execSync('cp /app/dist/routes/users.js /app/dist/routes/users.js.backup');
    
    let content = fs.readFileSync('/app/dist/routes/users.js', 'utf8');
    
    // 移除 requireRole 中間件
    content = content.replace(
        /router\.delete\('\/:id', auth_1\.authenticateToken, \(0, auth_1\.requireRole\)\(\[types_1\.Role\.BOSS, types_1\.Role\.MANAGER\]\), async/,
        "router.delete('/:id', auth_1.authenticateToken, async"
    );
    
    // 替換權限檢查邏輯
    const oldPermissionCheck = `        // 權限檢查
        if (currentUser.role === types_1.Role.MANAGER) {
            // MANAGER 不能刪除 BOSS 或其他 MANAGER
            if (userToDelete.role === types_1.Role.BOSS || userToDelete.role === types_1.Role.MANAGER) {
                return res.status(403).json({ error: '無權刪除該用戶' });
            }
        }`;
    
    const newPermissionCheck = `        // 權限檢查: 需要修改人員權限
        const permissions = currentUser.permissions ? JSON.parse(currentUser.permissions) : [];
        const hasPersonnelPermission = permissions.includes('personnel');
        
        // BOSS 可以刪除任何人
        const isBoss = currentUser.role === 'BOSS';
        
        if (!isBoss && !hasPersonnelPermission) {
            return res.status(403).json({ error: '無權刪除員工，需要修改人員權限' });
        }
        
        // 非 BOSS 只能刪除自己部門的員工
        if (!isBoss && userToDelete.department !== currentUser.department) {
            return res.status(403).json({ error: '只能刪除自己部門的員工' });
        }
        
        // 任何人都不能刪除 BOSS
        if (userToDelete.role === 'BOSS') {
            return res.status(403).json({ error: '無權刪除 BOSS 帳號' });
        }`;
    
    content = content.replace(oldPermissionCheck, newPermissionCheck);
    
    fs.writeFileSync('/app/dist/routes/users.js', content, 'utf8');
    console.log('SUCCESS: Delete user permission logic updated');
} catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
}
