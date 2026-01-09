const fs = require('fs');

const filePath = '/app/dist/routes/departments.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing department DELETE route...');

// Check if dbCall is imported
if (!content.includes('dbCall')) {
  console.log('Adding dbCall import...');
  // Find the auth import line
  const authImportMatch = content.match(/const.*auth.*=.*require.*auth.*\);/);
  if (authImportMatch) {
    const insertPos = content.indexOf(authImportMatch[0]) + authImportMatch[0].length;
    content = content.substring(0, insertPos) + "\nconst { dbCall } = require('../database-v2');" + content.substring(insertPos);
  }
}

// Replace db.get with dbCall
content = content.replace(
  /const departmentToDelete = await db\.get\('SELECT \* FROM departments WHERE id = \?', \[id\]\);/g,
  "const departmentToDelete = await dbCall(db, 'get', 'SELECT * FROM departments WHERE id = ?', [id]);"
);

// Replace db.run with dbCall for DELETE
content = content.replace(
  /await db\.run\('DELETE FROM departments WHERE id = \?', \[id\]\);/g,
  `// Cascade delete related data
        await dbCall(db, 'run', 'DELETE FROM schedules WHERE department_id = ?', [id]);
        await dbCall(db, 'run', 'DELETE FROM routine_templates WHERE department_id = ?', [id]);
        await dbCall(db, 'run', 'DELETE FROM routine_records WHERE department_id = ?', [id]);
        await dbCall(db, 'run', 'DELETE FROM leave_requests WHERE department_id = ?', [id]);
        
        // Delete department
        await dbCall(db, 'run', 'DELETE FROM departments WHERE id = ?', [id]);`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed DELETE route');
