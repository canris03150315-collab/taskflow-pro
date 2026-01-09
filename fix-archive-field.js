// Fix PUT route to handle is_archived field (Pure ASCII)
const fs = require('fs');

console.log('Fixing PUT route to handle is_archived...');

const tasksPath = '/app/dist/routes/tasks.js';
let content = fs.readFileSync(tasksPath, 'utf8');

// Step 1: Add is_archived to destructuring
const oldDestructure = "const { title, description, urgency, deadline, assigned_to_user_id, assigned_to_department, status, progress, is_offline, note } = req.body;";
const newDestructure = "const { title, description, urgency, deadline, assigned_to_user_id, assigned_to_department, status, progress, is_offline, note, is_archived } = req.body;";

if (content.includes(oldDestructure)) {
    content = content.replace(oldDestructure, newDestructure);
    console.log('Step 1: Added is_archived to destructuring');
} else {
    console.log('ERROR: Could not find destructuring line');
    process.exit(1);
}

// Step 2: Add is_archived to updates
const insertPoint = "        if (progress !== undefined) {";
const archiveHandling = `        if (is_archived !== undefined) {
            updates.push('is_archived = ?');
            params.push(is_archived ? 1 : 0);
        }
        `;

if (content.includes(insertPoint)) {
    content = content.replace(insertPoint, archiveHandling + insertPoint);
    console.log('Step 2: Added is_archived handling');
} else {
    console.log('ERROR: Could not find insert point');
    process.exit(1);
}

fs.writeFileSync(tasksPath, content, 'utf8');
console.log('SUCCESS: is_archived field handling added');
console.log('Now PUT route will correctly save archive status');
