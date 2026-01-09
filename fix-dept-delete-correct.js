const fs = require('fs');

const filePath = '/app/dist/routes/departments.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing department DELETE route (removing dbCall)...');

// Remove the incorrect dbCall import
content = content.replace(/const \{ dbCall \} = require\('\.\.\/database-v2'\);?\n?/g, '');

// Replace dbCall back to db.get (SecureDatabase handles it)
content = content.replace(
  /await dbCall\(db, 'get', 'SELECT \* FROM departments WHERE id = \?', \[id\]\);/g,
  "await db.get('SELECT * FROM departments WHERE id = ?', [id]);"
);

// Replace cascade delete with proper db.run calls
content = content.replace(
  /\/\/ Cascade delete related data[\s\S]*?await dbCall\(db, 'run', 'DELETE FROM departments WHERE id = \?', \[id\]\);/,
  `// Check if department has users
        const usersInDept = await db.get('SELECT COUNT(*) as count FROM users WHERE department = ?', [id]);
        if (usersInDept && usersInDept.count > 0) {
            return res.status(400).json({ error: '\\u7121\\u6cd5\\u522a\\u9664\\uff1a\\u90e8\\u9580\\u4e2d\\u9084\\u6709\\u54e1\\u5de5' });
        }

        // Cascade delete related data
        console.log('[Departments] Cascade deleting related data for:', id);
        await db.run('DELETE FROM schedules WHERE department_id = ?', [id]);
        await db.run('DELETE FROM routine_templates WHERE department_id = ?', [id]);
        await db.run('DELETE FROM routine_records WHERE department_id = ?', [id]);
        await db.run('DELETE FROM leave_requests WHERE department_id = ?', [id]);
        
        // Delete department
        await db.run('DELETE FROM departments WHERE id = ?', [id]);`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed DELETE route with db.run');
