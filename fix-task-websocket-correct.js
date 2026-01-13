// Fix: Correctly add WebSocket broadcast for TASK_CREATED
const fs = require('fs');

const filePath = '/app/dist/routes/tasks.js';
let content = fs.readFileSync(filePath, 'utf8');

// First, remove the incorrectly placed TASK_CREATED code (near DELETE route)
// It was mistakenly inserted before the DELETE response
content = content.replace(
    /\/\/ Broadcast WebSocket event for task creation\s*if \(req\.wsServer\) \{\s*req\.wsServer\.broadcastToAll\('TASK_CREATED', \{\s*task: createdTask,\s*timestamp: new Date\(\)\.toISOString\(\)\s*\}\);\s*\}\s*/g,
    ''
);

// Now find the correct location: after "const createdTask = await db.get..." and before "res.status(201).json"
// Pattern: createdTask is fetched, then immediately res.status(201).json

const createPattern = /(const createdTask = await db\.get\('SELECT \* FROM tasks WHERE id = \?', \[taskId\]\);)\s*(res\.status\(201\)\.json\(\{)/;

if (createPattern.test(content)) {
    content = content.replace(createPattern, (match, p1, p2) => {
        return `${p1}
        // Broadcast WebSocket event for task creation
        if (req.wsServer) {
            req.wsServer.broadcastToAll('TASK_CREATED', {
                task: createdTask,
                timestamp: new Date().toISOString()
            });
        }
        ${p2}`;
    });
    console.log('+ Added TASK_CREATED broadcast in correct location');
} else {
    console.log('! Could not find POST create task pattern');
}

// Also fix TASK_UPDATED - find the correct location in PUT route
// After "const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);" and before "res.json({"
const updatePattern = /(const updatedTask = await db\.get\('SELECT \* FROM tasks WHERE id = \?', \[id\]\);)\s*(res\.json\(\{)/;

// Check if TASK_UPDATED already exists in the right place
if (!content.includes("broadcastToAll('TASK_UPDATED'")) {
    if (updatePattern.test(content)) {
        content = content.replace(updatePattern, (match, p1, p2) => {
            return `${p1}
        // Broadcast WebSocket event for task update
        if (req.wsServer) {
            req.wsServer.broadcastToAll('TASK_UPDATED', {
                task: updatedTask,
                timestamp: new Date().toISOString()
            });
        }
        ${p2}`;
        });
        console.log('+ Added TASK_UPDATED broadcast in correct location');
    } else {
        console.log('! Could not find PUT update task pattern');
    }
} else {
    console.log('= TASK_UPDATED already exists');
}

// Write the updated content
fs.writeFileSync(filePath, content, 'utf8');

// Verify
const verify = fs.readFileSync(filePath, 'utf8');
const createdCount = (verify.match(/TASK_CREATED/g) || []).length;
const updatedCount = (verify.match(/TASK_UPDATED/g) || []).length;
const deletedCount = (verify.match(/TASK_DELETED/g) || []).length;

console.log('\nVerification:');
console.log('- TASK_CREATED occurrences:', createdCount);
console.log('- TASK_UPDATED occurrences:', updatedCount);
console.log('- TASK_DELETED occurrences:', deletedCount);

if (createdCount >= 1 && deletedCount >= 1) {
    console.log('\nSUCCESS: WebSocket events correctly placed');
} else {
    console.log('\nWARNING: May need manual verification');
}
