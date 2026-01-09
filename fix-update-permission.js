// Fix PUT route permission to allow task acceptor to update progress (Pure ASCII)
const fs = require('fs');

console.log('Fixing PUT route permission logic...');

const tasksPath = '/app/dist/routes/tasks.js';
let content = fs.readFileSync(tasksPath, 'utf8');

// Find the canEdit permission check
const oldPermission = "const canEdit = currentUser.role === types_1.Role.BOSS ||\n            currentUser.role === types_1.Role.MANAGER ||\n            (currentUser.role === types_1.Role.SUPERVISOR && existingTask.target_department === currentUser.department) ||\n            existingTask.created_by === currentUser.id;";

const newPermission = "const canEdit = currentUser.role === types_1.Role.BOSS ||\n            currentUser.role === types_1.Role.MANAGER ||\n            (currentUser.role === types_1.Role.SUPERVISOR && existingTask.target_department === currentUser.department) ||\n            existingTask.created_by === currentUser.id ||\n            existingTask.accepted_by_user_id === currentUser.id;";

if (content.includes(oldPermission)) {
    content = content.replace(oldPermission, newPermission);
    fs.writeFileSync(tasksPath, content, 'utf8');
    console.log('SUCCESS: Fixed PUT route permission');
    console.log('Users can now edit tasks if they are:');
    console.log('  1. BOSS or MANAGER');
    console.log('  2. SUPERVISOR (for their department tasks)');
    console.log('  3. Task creator');
    console.log('  4. Task acceptor (NEW)');
} else {
    console.log('ERROR: Could not find permission check');
    console.log('Trying alternative approach...');
    
    // Try to find the canEdit line and add the acceptor check
    const pattern = /const canEdit = currentUser\.role === types_1\.Role\.BOSS \|\|[\s\S]*?existingTask\.created_by === currentUser\.id;/;
    const match = content.match(pattern);
    
    if (match) {
        const oldStatement = match[0];
        const newStatement = oldStatement.replace(
            /existingTask\.created_by === currentUser\.id;/,
            'existingTask.created_by === currentUser.id ||\n            existingTask.accepted_by_user_id === currentUser.id;'
        );
        content = content.replace(oldStatement, newStatement);
        fs.writeFileSync(tasksPath, content, 'utf8');
        console.log('SUCCESS: Fixed using alternative pattern');
    } else {
        console.log('ERROR: Could not find any matching pattern');
        process.exit(1);
    }
}
