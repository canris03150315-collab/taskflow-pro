const fs = require('fs');
const path = '/app/dist/routes/users.js';

console.log('Adding avatar upload route to users.js...');

let content = fs.readFileSync(path, 'utf8');

// Find the position to insert the new route (before the sourceMappingURL)
const insertMarker = '//# sourceMappingURL=users.js.map';
const insertPosition = content.lastIndexOf(insertMarker);

if (insertPosition === -1) {
    console.error('ERROR: Could not find insertion point');
    console.error('Looking for: //# sourceMappingURL=users.js.map');
    process.exit(1);
}

// Avatar upload route (Pure ASCII with Unicode Escape)
const avatarRoute = `
// Avatar upload route
router.post('/:id/avatar', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { avatar } = req.body;
        const db = req.db;
        const currentUser = req.user;

        if (!avatar) {
            return res.status(400).json({ error: '\u7f3a\u5c11\u982d\u50cf\u6578\u64da' });
        }

        // Check permissions
        const isSelf = currentUser.id === id;
        const isBossOrManager = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER';
        const canUpdate = isSelf || isBossOrManager;

        if (!canUpdate) {
            return res.status(403).json({ error: '\u6b0a\u9650\u4e0d\u8db3' });
        }

        // Update avatar
        await db.run('UPDATE users SET avatar = ?, updated_at = ? WHERE id = ?', [
            avatar,
            new Date().toISOString(),
            id
        ]);

        // Get updated user
        const updatedUser = await db.get(
            'SELECT id, name, role, department, avatar, username, permissions, created_at, updated_at FROM users WHERE id = ?',
            [id]
        );

        if (!updatedUser) {
            return res.status(404).json({ error: '\u7528\u6236\u4e0d\u5b58\u5728' });
        }

        res.json({
            success: true,
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                role: updatedUser.role,
                department: updatedUser.department,
                avatar: updatedUser.avatar,
                username: updatedUser.username,
                permissions: updatedUser.permissions ? JSON.parse(updatedUser.permissions) : {},
                createdAt: updatedUser.created_at,
                updatedAt: updatedUser.updated_at
            }
        });
    } catch (error) {
        console.error('Update avatar error:', error);
        res.status(500).json({ error: '\u4f3a\u670d\u5668\u5167\u90e8\u932f\u8aa4' });
    }
});

`;

// Insert the route before module.exports
content = content.slice(0, insertPosition) + avatarRoute + content.slice(insertPosition);

// Write back
fs.writeFileSync(path, content, 'utf8');

console.log('SUCCESS: Avatar upload route added');
console.log('Route: POST /:id/avatar');
