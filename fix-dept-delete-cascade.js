const fs = require('fs');

const filePath = '/app/dist/routes/departments.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing department DELETE route with cascade logic...');

// Find the DELETE route
const deleteRoutePattern = /router\.delete\(['"]\/:\w+['"],[\s\S]*?}\);/;
const match = content.match(deleteRoutePattern);

if (!match) {
  console.log('ERROR: Could not find DELETE route');
  process.exit(1);
}

// New DELETE route with cascade logic and dbCall
const newDeleteRoute = `router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    const currentUser = req.user;
    const hasPermission = currentUser.role === 'BOSS' || (currentUser.permissions && currentUser.permissions.includes('MANAGE_DEPARTMENTS'));
    if (!hasPermission) { return res.status(403).json({ error: '\\u7121\\u6b0a\\u522a\\u9664\\u90e8\\u9580' }); }
    
    try {
        const db = req.db;
        const { id } = req.params;

        const departmentToDelete = await dbCall(db, 'get', 'SELECT * FROM departments WHERE id = ?', [id]);
        if (!departmentToDelete) {
            return res.status(404).json({ error: '\\u90e8\\u9580\\u4e0d\\u5b58\\u5728' });
        }

        // Check if department has users
        const usersInDept = await dbCall(db, 'get', 'SELECT COUNT(*) as count FROM users WHERE department = ?', [id]);
        if (usersInDept.count > 0) {
            return res.status(400).json({ error: '\\u7121\\u6cd5\\u522a\\u9664\\uff1a\\u90e8\\u9580\\u4e2d\\u9084\\u6709\\u54e1\\u5de5\\uff0c\\u8acb\\u5148\\u91cd\\u65b0\\u5206\\u914d\\u6216\\u522a\\u9664\\u54e1\\u5de5' });
        }

        // Cascade delete related data
        console.log('[Departments] Cascade deleting related data for:', id);
        
        // Delete schedules
        await dbCall(db, 'run', 'DELETE FROM schedules WHERE department_id = ?', [id]);
        
        // Delete routine templates
        await dbCall(db, 'run', 'DELETE FROM routine_templates WHERE department_id = ?', [id]);
        
        // Delete routine records
        await dbCall(db, 'run', 'DELETE FROM routine_records WHERE department_id = ?', [id]);
        
        // Delete leave requests
        await dbCall(db, 'run', 'DELETE FROM leave_requests WHERE department_id = ?', [id]);
        
        // Delete department
        await dbCall(db, 'run', 'DELETE FROM departments WHERE id = ?', [id]);

        console.log('[Departments] Deleted department:', id, 'by:', currentUser.name);
        res.json({ success: true, message: '\\u90e8\\u9580\\u5df2\\u522a\\u9664' });
    } catch (error) {
        console.error('\\u522a\\u9664\\u90e8\\u9580\\u932f\\u8aa4:', error);
        res.status(500).json({ error: '\\u4f3a\\u670d\\u5668\\u5167\\u90e8\\u932f\\u8aa4' });
    }
});`;

// Replace the old route
content = content.replace(deleteRoutePattern, newDeleteRoute);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed DELETE route with cascade logic and dbCall');
