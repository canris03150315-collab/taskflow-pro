// Fix SUPERVISOR permission logic to include public tasks (Pure ASCII)
const fs = require('fs');

console.log('Fixing SUPERVISOR permission logic...');

const tasksPath = '/app/dist/routes/tasks.js';
let content = fs.readFileSync(tasksPath, 'utf8');

// Find the SUPERVISOR permission check
const oldSupervisorLogic = "else if (currentUser.role === types_1.Role.SUPERVISOR) {\n            // \u4E3B\u7BA1\u53EF\u4EE5\u770B\u5230\u81EA\u5DF1\u90E8\u9580\u7684\u6240\u6709\u4EFB\u52D9\n            query += ' AND (t.target_department = ? OR t.created_by = ?)';\n            params.push(currentUser.department, currentUser.id);\n        }";

const newSupervisorLogic = "else if (currentUser.role === types_1.Role.SUPERVISOR) {\n            // \u4E3B\u7BA1\u53EF\u4EE5\u770B\u5230\uFF1A1.\u81EA\u5DF1\u90E8\u9580\u7684\u4EFB\u52D9 2.\u81EA\u5DF1\u5275\u5EFA\u7684 3.\u516C\u958B\u4EFB\u52D9\n            query += ' AND (t.target_department = ? OR t.created_by = ? OR (t.assigned_to_user_id IS NULL AND t.assigned_to_department IS NULL AND t.target_department IS NULL))';\n            params.push(currentUser.department, currentUser.id);\n        }";

if (content.includes(oldSupervisorLogic)) {
    content = content.replace(oldSupervisorLogic, newSupervisorLogic);
    fs.writeFileSync(tasksPath, content, 'utf8');
    console.log('SUCCESS: Fixed SUPERVISOR permission logic');
    console.log('Supervisors can now see:');
    console.log('  1. Tasks in their department');
    console.log('  2. Tasks they created');
    console.log('  3. Public tasks (no assignment and no target department)');
} else {
    console.log('ERROR: Could not find SUPERVISOR permission logic');
    console.log('Searching for alternative pattern...');
    
    // Try alternative pattern
    const altPattern = "query += ' AND (t.target_department = ? OR t.created_by = ?)'";
    if (content.includes(altPattern)) {
        const altNew = "query += ' AND (t.target_department = ? OR t.created_by = ? OR (t.assigned_to_user_id IS NULL AND t.assigned_to_department IS NULL AND t.target_department IS NULL))'";
        content = content.replace(altPattern, altNew);
        fs.writeFileSync(tasksPath, content, 'utf8');
        console.log('SUCCESS: Fixed using alternative pattern');
    } else {
        console.log('ERROR: Could not find any matching pattern');
        process.exit(1);
    }
}
