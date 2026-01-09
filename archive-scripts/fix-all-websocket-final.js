const fs = require('fs');

console.log('Adding WebSocket broadcasts to all routes...\n');

// 1. Fix reports.js
console.log('Fixing reports.js...');
let reportsContent = fs.readFileSync('/app/dist/routes/reports.js', 'utf8');

// DELETE - Add broadcast before res.json
reportsContent = reportsContent.replace(
    /console\.log\("\[Reports\] Report deleted:", id\);\s*res\.json\({ success: true }\);/,
    `console.log("[Reports] Report deleted:", id);
    
    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('report_deleted', { id });
    }
    
    res.json({ success: true });`
);

// POST - Add broadcast after getting created report
reportsContent = reportsContent.replace(
    /(const report = await db\.get\("SELECT \* FROM reports WHERE id = \?", \[id\]\);)\s*(res\.json\(report\);)/g,
    `$1
    
    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('report_created', report);
    }
    
    $2`
);

// PUT - Add broadcast after getting updated report
reportsContent = reportsContent.replace(
    /(const updated = await db\.get\("SELECT \* FROM reports WHERE id = \?", \[id\]\);)\s*(res\.json\(updated\);)/g,
    `$1
    
    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('report_updated', updated);
    }
    
    $2`
);

fs.writeFileSync('/app/dist/routes/reports.js', reportsContent, 'utf8');
console.log('✓ reports.js fixed');

// 2. Fix forum.js
console.log('Fixing forum.js...');
let forumContent = fs.readFileSync('/app/dist/routes/forum.js', 'utf8');

// POST - Create suggestion
forumContent = forumContent.replace(
    /(const suggestion = await db\.get\("SELECT \* FROM suggestions WHERE id = \?", \[id\]\);)\s*(res\.json\(suggestion\);)/g,
    `$1
    
    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('suggestion_created', suggestion);
    }
    
    $2`
);

// PUT - Update suggestion
forumContent = forumContent.replace(
    /(const updated = await db\.get\("SELECT \* FROM suggestions WHERE id = \?", \[id\]\);)\s*(res\.json\(updated\);)/g,
    `$1
    
    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('suggestion_updated', updated);
    }
    
    $2`
);

// DELETE - Delete suggestion
forumContent = forumContent.replace(
    /(await db\.run\("DELETE FROM suggestions WHERE id = \?", \[id\]\);)\s*(res\.json\({ success: true }\);)/g,
    `$1
    
    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('suggestion_deleted', { id });
    }
    
    $2`
);

fs.writeFileSync('/app/dist/routes/forum.js', forumContent, 'utf8');
console.log('✓ forum.js fixed');

// 3. Fix attendance.js
console.log('Fixing attendance.js...');
let attendanceContent = fs.readFileSync('/app/dist/routes/attendance.js', 'utf8');

// POST - Clock in/out - Add broadcast after getting record
attendanceContent = attendanceContent.replace(
    /(const record = await db\.get\("SELECT \* FROM attendance_records WHERE id = \?", \[id\]\);)\s*(res\.json\({ record }\);)/g,
    `$1
    
    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('attendance_updated', record);
    }
    
    $2`
);

// POST - Manual entry
attendanceContent = attendanceContent.replace(
    /(const newRecord = await db\.get\("SELECT \* FROM attendance_records WHERE id = \?", \[result\.lastID\]\);)\s*(res\.json\({ success: true, record: newRecord }\);)/g,
    `$1
    
    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('attendance_created', newRecord);
    }
    
    $2`
);

// PUT - Update manual entry
attendanceContent = attendanceContent.replace(
    /(const updated = await db\.get\("SELECT \* FROM attendance_records WHERE id = \?", \[id\]\);)\s*(res\.json\({ success: true, record: updated }\);)/g,
    `$1
    
    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('attendance_updated', updated);
    }
    
    $2`
);

// DELETE - Delete attendance
attendanceContent = attendanceContent.replace(
    /(await db\.run\("DELETE FROM attendance_records WHERE id = \?", \[id\]\);)\s*(res\.json\({ success: true)/g,
    `$1
    
    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('attendance_deleted', { id });
    }
    
    $2`
);

fs.writeFileSync('/app/dist/routes/attendance.js', attendanceContent, 'utf8');
console.log('✓ attendance.js fixed');

// 4. Fix routines.js
console.log('Fixing routines.js...');
let routinesContent = fs.readFileSync('/app/dist/routes/routines.js', 'utf8');

// POST - Update routine record
routinesContent = routinesContent.replace(
    /(const record = await db\.get\("SELECT \* FROM routine_records WHERE id = \?", \[recordId\]\);)\s*(res\.json\({ record }\);)/g,
    `$1
    
    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('routine_updated', record);
    }
    
    $2`
);

fs.writeFileSync('/app/dist/routes/routines.js', routinesContent, 'utf8');
console.log('✓ routines.js fixed');

console.log('\n✅ SUCCESS: All WebSocket broadcasts added!');
console.log('\nModified files:');
console.log('  - reports.js (CREATE, UPDATE, DELETE)');
console.log('  - forum.js (CREATE, UPDATE, DELETE)');
console.log('  - attendance.js (CREATE, UPDATE, DELETE)');
console.log('  - routines.js (UPDATE)');
