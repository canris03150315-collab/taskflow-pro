// Script to add WebSocket events to ALL modules (Pure ASCII)
const fs = require('fs');

console.log('Adding WebSocket events to all modules...\n');

// Helper function to add WebSocket broadcast
function addWebSocketToRoute(filePath, moduleName, eventPrefix) {
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`   \u26A0\uFE0F  ${filePath} not found, skipping`);
            return;
        }

        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // Add broadcast for POST routes (CREATE)
        const postPatterns = [
            /(\s+)(res\.status\(201\)\.json\([^)]+\);)/g,
            /(\s+)(res\.json\({ success: true, [^}]*id[^}]*}\);)/g
        ];

        postPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                content = content.replace(pattern, (match, indent, resJson) => {
                    if (match.includes('wsServer')) return match; // Already has WebSocket
                    return `${indent}// Broadcast WebSocket event\n${indent}if (req.wsServer) {\n${indent}    req.wsServer.broadcastToAll('${eventPrefix}_CREATED', {\n${indent}        timestamp: new Date().toISOString()\n${indent}    });\n${indent}}\n${indent}${resJson}`;
                });
                modified = true;
            }
        });

        // Add broadcast for PUT routes (UPDATE)
        const putPattern = /(await db\.run\('UPDATE [^']+[\s\S]*?\);[\s\S]*?)(res\.json\({ success: true)/g;
        if (content.match(putPattern)) {
            content = content.replace(putPattern, (match, updateQuery, resJson) => {
                if (match.includes('wsServer')) return match;
                const indent = match.match(/^(\s+)res\.json/m)?.[1] || '        ';
                return `${updateQuery}\n${indent}// Broadcast WebSocket event\n${indent}if (req.wsServer) {\n${indent}    req.wsServer.broadcastToAll('${eventPrefix}_UPDATED', {\n${indent}        timestamp: new Date().toISOString()\n${indent}    });\n${indent}}\n${indent}${resJson}`;
            });
            modified = true;
        }

        // Add broadcast for DELETE routes
        const deletePattern = /(await db\.run\('DELETE FROM [^']+[\s\S]*?\);[\s\S]*?)(res\.json\({ success: true)/g;
        if (content.match(deletePattern)) {
            content = content.replace(deletePattern, (match, deleteQuery, resJson) => {
                if (match.includes('wsServer')) return match;
                const indent = match.match(/^(\s+)res\.json/m)?.[1] || '        ';
                return `${deleteQuery}\n${indent}// Broadcast WebSocket event\n${indent}if (req.wsServer) {\n${indent}    req.wsServer.broadcastToAll('${eventPrefix}_DELETED', {\n${indent}        timestamp: new Date().toISOString()\n${indent}    });\n${indent}}\n${indent}${resJson}`;
            });
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`   \u2705 ${moduleName} updated`);
        } else {
            console.log(`   \u2139\uFE0F  ${moduleName} - no changes needed or already has WebSocket`);
        }
    } catch (error) {
        console.error(`   \u274C Error updating ${moduleName}:`, error.message);
    }
}

// Process all modules
const modules = [
    // Already done in previous step
    // { file: '/app/dist/routes/users.js', name: 'users.js', prefix: 'USER' },
    // { file: '/app/dist/routes/tasks.js', name: 'tasks.js', prefix: 'TASK' },
    // { file: '/app/dist/routes/finance.js', name: 'finance.js', prefix: 'FINANCE' },
    // { file: '/app/dist/routes/departments.js', name: 'departments.js', prefix: 'DEPARTMENT' },
    
    // New modules to add
    { file: '/app/dist/routes/announcements.js', name: 'announcements.js', prefix: 'ANNOUNCEMENT' },
    { file: '/app/dist/routes/memos.js', name: 'memos.js', prefix: 'MEMO' },
    { file: '/app/dist/routes/forum.js', name: 'forum.js', prefix: 'SUGGESTION' },
    { file: '/app/dist/routes/reports.js', name: 'reports.js', prefix: 'REPORT' },
    { file: '/app/dist/routes/attendance.js', name: 'attendance.js', prefix: 'ATTENDANCE' },
    { file: '/app/dist/routes/routines.js', name: 'routines.js', prefix: 'SOP' }
];

modules.forEach((module, index) => {
    console.log(`${index + 1}. Processing ${module.name}...`);
    addWebSocketToRoute(module.file, module.name, module.prefix);
});

console.log('\n\u{1F389} All modules processed!');
console.log('\nNew event types added:');
console.log('- ANNOUNCEMENT_CREATED/UPDATED/DELETED');
console.log('- MEMO_CREATED/UPDATED/DELETED');
console.log('- SUGGESTION_CREATED/UPDATED/DELETED');
console.log('- REPORT_CREATED/UPDATED/DELETED');
console.log('- ATTENDANCE_CREATED/UPDATED/DELETED');
console.log('- SOP_CREATED/UPDATED/DELETED');
