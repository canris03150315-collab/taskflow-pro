// Fix PUT route to handle note field (Pure ASCII)
const fs = require('fs');

console.log('Fixing PUT route to handle note field...');

const tasksPath = '/app/dist/routes/tasks.js';
let content = fs.readFileSync(tasksPath, 'utf8');

// Step 1: Add 'note' to the destructuring
const oldDestructure = "const { title, description, urgency, deadline, assigned_to_user_id, assigned_to_department, status, progress, is_offline } = req.body;";
const newDestructure = "const { title, description, urgency, deadline, assigned_to_user_id, assigned_to_department, status, progress, is_offline, note } = req.body;";

if (content.includes(oldDestructure)) {
    content = content.replace(oldDestructure, newDestructure);
    console.log('Step 1: Added note to destructuring');
} else {
    console.log('ERROR: Could not find destructuring line');
    process.exit(1);
}

// Step 2: Add note to timelineContent if provided
const insertPoint = "        if (progress !== undefined) {";
const noteHandling = `        // \u5099\u8A3B\u8655\u7406
        if (note) {
            timelineContent += note + '; ';
        }
        `;

if (content.includes(insertPoint)) {
    content = content.replace(insertPoint, noteHandling + insertPoint);
    console.log('Step 2: Added note handling before progress check');
} else {
    console.log('ERROR: Could not find progress check');
    process.exit(1);
}

fs.writeFileSync(tasksPath, content, 'utf8');
console.log('SUCCESS: Note field handling added');
console.log('Now the PUT route will:');
console.log('  1. Accept note parameter from request body');
console.log('  2. Add note to timelineContent if provided');
console.log('  3. Save note in task_timeline table');
