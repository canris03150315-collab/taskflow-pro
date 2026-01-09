// Fix GET /tasks/:id permission check (Pure ASCII)
const fs = require('fs');

console.log('Fixing GET /tasks/:id permission check...');

const tasksPath = '/app/dist/routes/tasks.js';
let content = fs.readFileSync(tasksPath, 'utf8');

// Find the canAccess permission check in GET /:id route
const oldPermission = `const canAccess = currentUser.role === types_1.Role.BOSS ||
            currentUser.role === types_1.Role.MANAGER ||
            (currentUser.role === types_1.Role.SUPERVISOR && task.target_department === currentUser.department) ||
            task.assigned_to_user_id === currentUser.id ||
            task.created_by === currentUser.id;`;

const newPermission = `const canAccess = currentUser.role === types_1.Role.BOSS ||
            currentUser.role === types_1.Role.MANAGER ||
            (currentUser.role === types_1.Role.SUPERVISOR && task.target_department === currentUser.department) ||
            task.assigned_to_user_id === currentUser.id ||
            task.created_by === currentUser.id ||
            task.accepted_by_user_id === currentUser.id;`;

if (content.includes(oldPermission)) {
    content = content.replace(oldPermission, newPermission);
    fs.writeFileSync(tasksPath, content, 'utf8');
    console.log('SUCCESS: Fixed GET permission check');
    console.log('Users can now access tasks if they are:');
    console.log('  1. BOSS or MANAGER');
    console.log('  2. SUPERVISOR (for their department tasks)');
    console.log('  3. Assigned user');
    console.log('  4. Task creator');
    console.log('  5. Task acceptor (NEW)');
} else {
    console.log('ERROR: Could not find permission check');
    console.log('Trying to find the pattern...');
    
    // Try to find the canAccess line
    const pattern = /const canAccess = currentUser\.role === types_1\.Role\.BOSS \|\|[\s\S]*?task\.created_by === currentUser\.id;/;
    const match = content.match(pattern);
    
    if (match) {
        const oldStatement = match[0];
        const newStatement = oldStatement.replace(
            /task\.created_by === currentUser\.id;/,
            'task.created_by === currentUser.id ||\n            task.accepted_by_user_id === currentUser.id;'
        );
        content = content.replace(oldStatement, newStatement);
        fs.writeFileSync(tasksPath, content, 'utf8');
        console.log('SUCCESS: Fixed using alternative pattern');
    } else {
        console.log('ERROR: Could not find any matching pattern');
        process.exit(1);
    }
}
