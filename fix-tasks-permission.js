// Fix tasks permission logic to include public tasks (Pure ASCII)
const fs = require('fs');

console.log('Fixing tasks permission logic...');

const tasksPath = '/app/dist/routes/tasks.js';
let content = fs.readFileSync(tasksPath, 'utf8');

// Find the EMPLOYEE permission check
const oldEmployeeLogic = "if (currentUser.role === types_1.Role.EMPLOYEE) {\n            // \u54E1\u5DE5\u53EA\u80FD\u770B\u5230\u5206\u914D\u7D66\u81EA\u5DF1\u6216\u81EA\u5DF1\u90E8\u9580\u7684\u4EFB\u52D9\n            query += ' AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ?)';\n            params.push(currentUser.id, currentUser.department);\n        }";

const newEmployeeLogic = "if (currentUser.role === types_1.Role.EMPLOYEE) {\n            // \u54E1\u5DE5\u53EF\u4EE5\u770B\u5230\uFF1A1.\u5206\u914D\u7D66\u81EA\u5DF1\u7684 2.\u5206\u914D\u7D66\u81EA\u5DF1\u90E8\u9580\u7684 3.\u516C\u958B\u4EFB\u52D9\n            query += ' AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ? OR (t.assigned_to_user_id IS NULL AND t.assigned_to_department IS NULL))';\n            params.push(currentUser.id, currentUser.department);\n        }";

if (content.includes(oldEmployeeLogic)) {
    content = content.replace(oldEmployeeLogic, newEmployeeLogic);
    fs.writeFileSync(tasksPath, content, 'utf8');
    console.log('SUCCESS: Fixed EMPLOYEE permission logic');
    console.log('Employees can now see:');
    console.log('  1. Tasks assigned to themselves');
    console.log('  2. Tasks assigned to their department');
    console.log('  3. Public tasks (no assignment)');
} else {
    console.log('ERROR: Could not find EMPLOYEE permission logic');
    console.log('Searching for alternative pattern...');
    
    // Try alternative pattern
    const altPattern = "query += ' AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ?)'";
    if (content.includes(altPattern)) {
        const altNew = "query += ' AND (t.assigned_to_user_id = ? OR t.assigned_to_department = ? OR (t.assigned_to_user_id IS NULL AND t.assigned_to_department IS NULL))'";
        content = content.replace(altPattern, altNew);
        fs.writeFileSync(tasksPath, content, 'utf8');
        console.log('SUCCESS: Fixed using alternative pattern');
    } else {
        console.log('ERROR: Could not find any matching pattern');
        process.exit(1);
    }
}
