// Script to add WebSocket event broadcasting to API routes (Pure ASCII)
const fs = require('fs');

console.log('Adding WebSocket event broadcasting to API routes...');

// Helper function to add WebSocket broadcast after successful operations
function addWebSocketBroadcast(content, routePattern, eventType, payloadVar) {
    // Find the success response and add broadcast before it
    const lines = content.split('\n');
    const modifiedLines = [];
    let inTargetRoute = false;
    let bracketCount = 0;
    let modified = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        modifiedLines.push(line);
        
        // Detect route start
        if (line.includes(routePattern)) {
            inTargetRoute = true;
            bracketCount = 0;
        }
        
        if (inTargetRoute) {
            // Count brackets to track scope
            bracketCount += (line.match(/{/g) || []).length;
            bracketCount -= (line.match(/}/g) || []).length;
            
            // Look for res.json or res.status(201).json patterns before closing
            if ((line.includes('res.json') || line.includes('res.status(201)')) && 
                !line.includes('error') && 
                !modified) {
                
                // Insert WebSocket broadcast before the response
                const indent = line.match(/^\s*/)[0];
                modifiedLines.splice(modifiedLines.length - 1, 0, 
                    `${indent}// Broadcast WebSocket event`,
                    `${indent}if (req.wsServer) {`,
                    `${indent}    req.wsServer.broadcastToAll('${eventType}', {`,
                    `${indent}        ${payloadVar},`,
                    `${indent}        timestamp: new Date().toISOString()`,
                    `${indent}    });`,
                    `${indent}}`
                );
                modified = true;
            }
            
            // Exit route when brackets balanced
            if (bracketCount === 0 && modified) {
                inTargetRoute = false;
                modified = false;
            }
        }
    }
    
    return modifiedLines.join('\n');
}

// Process users.js
try {
    console.log('\n1. Processing users.js...');
    let usersContent = fs.readFileSync('/app/dist/routes/users.js', 'utf8');
    
    // Add broadcasts for POST (create user)
    usersContent = usersContent.replace(
        /(const newUser = {[\s\S]*?};[\s\S]*?)(res\.status\(201\)\.json)/,
        `$1
        // Broadcast WebSocket event
        if (req.wsServer) {
            req.wsServer.broadcastToAll('USER_CREATED', {
                user: newUser,
                timestamp: new Date().toISOString()
            });
        }
        $2`
    );
    
    // Add broadcasts for PUT (update user)
    usersContent = usersContent.replace(
        /(await db\.run\('UPDATE users SET[\s\S]*?\);[\s\S]*?)(res\.json\({ success: true)/,
        `$1
        // Broadcast WebSocket event
        if (req.wsServer) {
            const updatedUser = await db.get('SELECT id, name, role, department, avatar, username, permissions FROM users WHERE id = ?', [id]);
            req.wsServer.broadcastToAll('USER_UPDATED', {
                user: updatedUser,
                timestamp: new Date().toISOString()
            });
        }
        $2`
    );
    
    // Add broadcasts for DELETE
    usersContent = usersContent.replace(
        /(await db\.run\('DELETE FROM users WHERE id = \?'[\s\S]*?)(res\.json\({ success: true)/,
        `$1
        // Broadcast WebSocket event
        if (req.wsServer) {
            req.wsServer.broadcastToAll('USER_DELETED', {
                userId: id,
                timestamp: new Date().toISOString()
            });
        }
        $2`
    );
    
    fs.writeFileSync('/app/dist/routes/users.js', usersContent, 'utf8');
    console.log('   \u2705 users.js updated');
} catch (error) {
    console.error('   \u274c Error updating users.js:', error.message);
}

// Process tasks.js
try {
    console.log('\n2. Processing tasks.js...');
    let tasksContent = fs.readFileSync('/app/dist/routes/tasks.js', 'utf8');
    
    // Add broadcasts for POST (create task)
    tasksContent = tasksContent.replace(
        /(const newTask = {[\s\S]*?};[\s\S]*?)(res\.status\(201\)\.json)/,
        `$1
        // Broadcast WebSocket event
        if (req.wsServer) {
            req.wsServer.broadcastToAll('TASK_CREATED', {
                task: newTask,
                timestamp: new Date().toISOString()
            });
        }
        $2`
    );
    
    // Add broadcasts for PUT (update task)
    tasksContent = tasksContent.replace(
        /(await db\.run\('UPDATE tasks SET[\s\S]*?\);[\s\S]*?)(res\.json\({ success: true)/,
        `$1
        // Broadcast WebSocket event
        if (req.wsServer) {
            const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
            req.wsServer.broadcastToAll('TASK_UPDATED', {
                task: updatedTask,
                timestamp: new Date().toISOString()
            });
        }
        $2`
    );
    
    // Add broadcasts for DELETE
    tasksContent = tasksContent.replace(
        /(await db\.run\('DELETE FROM tasks WHERE id = \?'[\s\S]*?)(res\.json\({ success: true)/,
        `$1
        // Broadcast WebSocket event
        if (req.wsServer) {
            req.wsServer.broadcastToAll('TASK_DELETED', {
                taskId: id,
                timestamp: new Date().toISOString()
            });
        }
        $2`
    );
    
    fs.writeFileSync('/app/dist/routes/tasks.js', tasksContent, 'utf8');
    console.log('   \u2705 tasks.js updated');
} catch (error) {
    console.error('   \u274c Error updating tasks.js:', error.message);
}

// Process finance.js
try {
    console.log('\n3. Processing finance.js...');
    let financeContent = fs.readFileSync('/app/dist/routes/finance.js', 'utf8');
    
    // Add broadcasts for POST
    financeContent = financeContent.replace(
        /(dbCall\(db, 'prepare', 'INSERT INTO finance[\s\S]*?\.run\([^)]+\);[\s\S]*?)(res\.status\(201\)\.json)/,
        `$1
        // Broadcast WebSocket event
        if (req.wsServer) {
            const newRecord = await db.get('SELECT * FROM finance WHERE id = ?', [id]);
            req.wsServer.broadcastToAll('FINANCE_CREATED', {
                finance: newRecord,
                timestamp: new Date().toISOString()
            });
        }
        $2`
    );
    
    // Add broadcasts for PUT
    financeContent = financeContent.replace(
        /(dbCall\(db, 'prepare', 'UPDATE finance SET[\s\S]*?\.run\([^)]+\);[\s\S]*?)(res\.json\({ success: true)/,
        `$1
        // Broadcast WebSocket event
        if (req.wsServer) {
            const updatedRecord = await db.get('SELECT * FROM finance WHERE id = ?', [id]);
            req.wsServer.broadcastToAll('FINANCE_UPDATED', {
                finance: updatedRecord,
                timestamp: new Date().toISOString()
            });
        }
        $2`
    );
    
    // Add broadcasts for DELETE
    financeContent = financeContent.replace(
        /(dbCall\(db, 'prepare', 'DELETE FROM finance WHERE id = \?'[\s\S]*?)(res\.json\({ success: true)/,
        `$1
        // Broadcast WebSocket event
        if (req.wsServer) {
            req.wsServer.broadcastToAll('FINANCE_DELETED', {
                financeId: id,
                timestamp: new Date().toISOString()
            });
        }
        $2`
    );
    
    fs.writeFileSync('/app/dist/routes/finance.js', financeContent, 'utf8');
    console.log('   \u2705 finance.js updated');
} catch (error) {
    console.error('   \u274c Error updating finance.js:', error.message);
}

// Process departments.js
try {
    console.log('\n4. Processing departments.js...');
    let deptContent = fs.readFileSync('/app/dist/routes/departments.js', 'utf8');
    
    // Add broadcasts for POST
    deptContent = deptContent.replace(
        /(await db\.run\('INSERT INTO departments[\s\S]*?\);[\s\S]*?)(res\.status\(201\)\.json)/,
        `$1
        // Broadcast WebSocket event
        if (req.wsServer) {
            const newDept = await db.get('SELECT * FROM departments WHERE id = ?', [id]);
            req.wsServer.broadcastToAll('DEPARTMENT_CREATED', {
                department: newDept,
                timestamp: new Date().toISOString()
            });
        }
        $2`
    );
    
    // Add broadcasts for PUT
    deptContent = deptContent.replace(
        /(await db\.run\('UPDATE departments SET[\s\S]*?\);[\s\S]*?)(res\.json\({ success: true)/,
        `$1
        // Broadcast WebSocket event
        if (req.wsServer) {
            const updatedDept = await db.get('SELECT * FROM departments WHERE id = ?', [id]);
            req.wsServer.broadcastToAll('DEPARTMENT_UPDATED', {
                department: updatedDept,
                timestamp: new Date().toISOString()
            });
        }
        $2`
    );
    
    // Add broadcasts for DELETE
    deptContent = deptContent.replace(
        /(await db\.run\('DELETE FROM departments WHERE id = \?'[\s\S]*?)(res\.json\({ success: true)/,
        `$1
        // Broadcast WebSocket event
        if (req.wsServer) {
            req.wsServer.broadcastToAll('DEPARTMENT_DELETED', {
                departmentId: id,
                timestamp: new Date().toISOString()
            });
        }
        $2`
    );
    
    fs.writeFileSync('/app/dist/routes/departments.js', deptContent, 'utf8');
    console.log('   \u2705 departments.js updated');
} catch (error) {
    console.error('   \u274c Error updating departments.js:', error.message);
}

console.log('\n\u{1F389} WebSocket events added successfully!');
