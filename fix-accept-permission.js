// Fix accept route permission logic to allow public tasks (Pure ASCII)
const fs = require('fs');

console.log('Fixing accept route permission logic...');

const tasksPath = '/app/dist/routes/tasks.js';
let content = fs.readFileSync(tasksPath, 'utf8');

// Find the accept permission check
const oldAcceptLogic = "const canAccept = task.assigned_to_user_id === currentUser.id ||\n            (task.assigned_to_department === currentUser.department && currentUser.role === types_1.Role.SUPERVISOR);";

const newAcceptLogic = "const canAccept = task.assigned_to_user_id === currentUser.id ||\n            (task.assigned_to_department === currentUser.department && currentUser.role === types_1.Role.SUPERVISOR) ||\n            (task.assigned_to_user_id === null && task.assigned_to_department === null);";

if (content.includes(oldAcceptLogic)) {
    content = content.replace(oldAcceptLogic, newAcceptLogic);
    fs.writeFileSync(tasksPath, content, 'utf8');
    console.log('SUCCESS: Fixed accept permission logic');
    console.log('Users can now accept:');
    console.log('  1. Tasks assigned to themselves');
    console.log('  2. Tasks assigned to their department (SUPERVISOR only)');
    console.log('  3. Public tasks (no assignment)');
} else {
    console.log('ERROR: Could not find accept permission logic');
    console.log('Searching for alternative pattern...');
    
    // Try alternative pattern
    const altPattern = "const canAccept = task.assigned_to_user_id === currentUser.id ||";
    if (content.includes(altPattern)) {
        // Find the complete canAccept statement
        const regex = /const canAccept = task\.assigned_to_user_id === currentUser\.id \|\|[\s\S]*?;/;
        const match = content.match(regex);
        
        if (match) {
            const oldStatement = match[0];
            const newStatement = oldStatement.replace(
                /;$/,
                ' ||\n            (task.assigned_to_user_id === null && task.assigned_to_department === null);'
            );
            content = content.replace(oldStatement, newStatement);
            fs.writeFileSync(tasksPath, content, 'utf8');
            console.log('SUCCESS: Fixed using alternative pattern');
        } else {
            console.log('ERROR: Could not find canAccept statement');
            process.exit(1);
        }
    } else {
        console.log('ERROR: Could not find any matching pattern');
        process.exit(1);
    }
}
