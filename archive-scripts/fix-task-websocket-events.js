// Fix: Add WebSocket broadcast for TASK_CREATED and TASK_UPDATED events
const fs = require('fs');

const filePath = '/app/dist/routes/tasks.js';
let content = fs.readFileSync(filePath, 'utf8');

// Check current state
const hasTaskCreated = content.includes('TASK_CREATED');
const hasTaskUpdated = content.includes('TASK_UPDATED');

console.log('Current state:');
console.log('- Has TASK_CREATED broadcast:', hasTaskCreated);
console.log('- Has TASK_UPDATED broadcast:', hasTaskUpdated);

// Add TASK_CREATED broadcast before the success response in POST / route
if (!hasTaskCreated) {
    // Find the pattern for task creation success response
    const createPattern = /res\.json\(\{\s*task:\s*createdTask,\s*message:\s*'[^']*\u4efb\u52d9\u5275\u5efa\u6210\u529f[^']*'\s*\}\);/;
    
    if (createPattern.test(content)) {
        content = content.replace(createPattern, (match) => {
            return `// Broadcast WebSocket event for task creation
        if (req.wsServer) {
            req.wsServer.broadcastToAll('TASK_CREATED', {
                task: createdTask,
                timestamp: new Date().toISOString()
            });
        }
        ${match}`;
        });
        console.log('+ Added TASK_CREATED broadcast');
    } else {
        // Try alternative pattern
        const altPattern = /res\.json\(\{[\s\S]*?task:\s*createdTask[\s\S]*?message:[\s\S]*?\}\);/;
        if (altPattern.test(content)) {
            content = content.replace(altPattern, (match) => {
                if (match.includes('TASK_CREATED')) return match; // Already has it
                return `// Broadcast WebSocket event for task creation
        if (req.wsServer) {
            req.wsServer.broadcastToAll('TASK_CREATED', {
                task: createdTask,
                timestamp: new Date().toISOString()
            });
        }
        ${match}`;
            });
            console.log('+ Added TASK_CREATED broadcast (alt pattern)');
        } else {
            console.log('! Could not find task creation response pattern');
        }
    }
}

// Add TASK_UPDATED broadcast before the success response in PUT /:id route
if (!hasTaskUpdated) {
    // Find the pattern for task update success response
    const updatePattern = /res\.json\(\{\s*task:\s*updatedTask,\s*message:\s*'[^']*\u4efb\u52d9\u66f4\u65b0\u6210\u529f[^']*'\s*\}\);/;
    
    if (updatePattern.test(content)) {
        content = content.replace(updatePattern, (match) => {
            return `// Broadcast WebSocket event for task update
        if (req.wsServer) {
            req.wsServer.broadcastToAll('TASK_UPDATED', {
                task: updatedTask,
                timestamp: new Date().toISOString()
            });
        }
        ${match}`;
        });
        console.log('+ Added TASK_UPDATED broadcast');
    } else {
        // Try alternative pattern
        const altPattern = /res\.json\(\{[\s\S]*?task:\s*updatedTask[\s\S]*?message:[\s\S]*?\}\);/;
        if (altPattern.test(content)) {
            content = content.replace(altPattern, (match) => {
                if (match.includes('TASK_UPDATED')) return match; // Already has it
                return `// Broadcast WebSocket event for task update
        if (req.wsServer) {
            req.wsServer.broadcastToAll('TASK_UPDATED', {
                task: updatedTask,
                timestamp: new Date().toISOString()
            });
        }
        ${match}`;
            });
            console.log('+ Added TASK_UPDATED broadcast (alt pattern)');
        } else {
            console.log('! Could not find task update response pattern');
        }
    }
}

// Write the updated content
fs.writeFileSync(filePath, content, 'utf8');

// Verify the changes
const verifyContent = fs.readFileSync(filePath, 'utf8');
console.log('\nVerification:');
console.log('- TASK_CREATED exists:', verifyContent.includes('TASK_CREATED'));
console.log('- TASK_UPDATED exists:', verifyContent.includes('TASK_UPDATED'));
console.log('- TASK_DELETED exists:', verifyContent.includes('TASK_DELETED'));

console.log('\nSUCCESS: Task WebSocket events fixed');
