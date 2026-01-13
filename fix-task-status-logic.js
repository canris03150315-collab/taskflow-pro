// Fix: Task status should be 'Assigned' when assigned_to_user_id is provided
const fs = require('fs');

const filePath = '/app/dist/routes/tasks.js';
let content = fs.readFileSync(filePath, 'utf8');

// Find the INSERT statement for tasks and fix the status logic
// Current: always uses "Open"
// Should: use "Assigned" if assigned_to_user_id is provided, otherwise "Open"

// Find the pattern where status is hardcoded as "Open" in the INSERT
// The INSERT has these values in order: taskId, title, description, urgency, deadline, 
// target_department, assigned_to_user_id, assigned_to_department, currentUser.id, "Open", 0, 1

// We need to replace the hardcoded "Open" with a conditional expression
const oldPattern = `            currentUser.id,
            "Open",
            0,`;

const newPattern = `            currentUser.id,
            assigned_to_user_id ? "Assigned" : "Open",
            0,`;

if (content.includes(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    console.log('+ Fixed task status logic: now uses "Assigned" when assigned_to_user_id is provided');
} else {
    console.log('! Could not find the pattern to fix');
    console.log('Searching for alternative patterns...');
    
    // Try alternative pattern with different whitespace
    const altPattern = /currentUser\.id,\s*"Open",\s*0,/;
    if (altPattern.test(content)) {
        content = content.replace(altPattern, 'currentUser.id,\n            assigned_to_user_id ? "Assigned" : "Open",\n            0,');
        console.log('+ Fixed task status logic (alt pattern)');
    } else {
        console.log('! No matching pattern found');
    }
}

fs.writeFileSync(filePath, content, 'utf8');

// Verify
const verify = fs.readFileSync(filePath, 'utf8');
if (verify.includes('assigned_to_user_id ? "Assigned" : "Open"')) {
    console.log('\nSUCCESS: Task status logic fixed');
    console.log('- Tasks with assigned_to_user_id will have status "Assigned"');
    console.log('- Tasks without assigned_to_user_id will have status "Open"');
} else {
    console.log('\nWARNING: Fix may not have been applied correctly');
}
