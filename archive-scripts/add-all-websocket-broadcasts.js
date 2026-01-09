const fs = require('fs');

console.log('Adding WebSocket broadcasts to all routes...');

// Helper function to add broadcast after a database operation
function addBroadcastAfterDbOperation(content, pattern, eventType, payloadVar) {
    const broadcastCode = `
    
    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('${eventType}', ${payloadVar});
    }`;
    
    return content.replace(pattern, `$&${broadcastCode}`);
}

// 1. Fix reports.js
console.log('Fixing reports.js...');
let reportsContent = fs.readFileSync('/app/dist/routes/reports.js', 'utf8');

// POST - Create report
reportsContent = addBroadcastAfterDbOperation(
    reportsContent,
    /const report = await db\.get\("SELECT \* FROM reports WHERE id = \?", \[id\]\);\s*res\.json\(report\);/,
    'report_created',
    'report'
);

// PUT - Update report
reportsContent = addBroadcastAfterDbOperation(
    reportsContent,
    /const updated = await db\.get\("SELECT \* FROM reports WHERE id = \?", \[id\]\);\s*res\.json\(updated\);/,
    'report_updated',
    'updated'
);

// DELETE - Delete report
reportsContent = addBroadcastAfterDbOperation(
    reportsContent,
    /await db\.run\("DELETE FROM reports WHERE id = \?", \[id\]\);\s*res\.json\({ success: true }\);/,
    'report_deleted',
    '{ id }'
);

fs.writeFileSync('/app/dist/routes/reports.js', reportsContent, 'utf8');
console.log('✓ reports.js fixed');

// 2. Fix forum.js (suggestions)
console.log('Fixing forum.js...');
let forumContent = fs.readFileSync('/app/dist/routes/forum.js', 'utf8');

// POST - Create suggestion
forumContent = addBroadcastAfterDbOperation(
    forumContent,
    /const suggestion = await db\.get\("SELECT \* FROM suggestions WHERE id = \?", \[id\]\);\s*res\.json\(suggestion\);/,
    'suggestion_created',
    'suggestion'
);

// PUT - Update suggestion status
forumContent = addBroadcastAfterDbOperation(
    forumContent,
    /const updated = await db\.get\("SELECT \* FROM suggestions WHERE id = \?", \[id\]\);\s*res\.json\(updated\);/,
    'suggestion_updated',
    'updated'
);

// DELETE - Delete suggestion
forumContent = addBroadcastAfterDbOperation(
    forumContent,
    /await db\.run\("DELETE FROM suggestions WHERE id = \?", \[id\]\);\s*res\.json\({ success: true }\);/,
    'suggestion_deleted',
    '{ id }'
);

fs.writeFileSync('/app/dist/routes/forum.js', forumContent, 'utf8');
console.log('✓ forum.js fixed');

// 3. Fix attendance.js
console.log('Fixing attendance.js...');
let attendanceContent = fs.readFileSync('/app/dist/routes/attendance.js', 'utf8');

// POST - Clock in
attendanceContent = addBroadcastAfterDbOperation(
    attendanceContent,
    /const record = await db\.get\("SELECT \* FROM attendance_records WHERE id = \?", \[id\]\);\s*res\.json\({ record }\);/,
    'attendance_created',
    'record'
);

// POST - Manual entry
attendanceContent = addBroadcastAfterDbOperation(
    attendanceContent,
    /const newRecord = await db\.get\("SELECT \* FROM attendance_records WHERE id = \?", \[result\.lastID\]\);\s*res\.json\({ success: true, record: newRecord }\);/,
    'attendance_created',
    'newRecord'
);

// PUT - Update manual entry
attendanceContent = addBroadcastAfterDbOperation(
    attendanceContent,
    /const updated = await db\.get\("SELECT \* FROM attendance_records WHERE id = \?", \[id\]\);\s*res\.json\({ success: true, record: updated }\);/,
    'attendance_updated',
    'updated'
);

// DELETE - Delete attendance
attendanceContent = addBroadcastAfterDbOperation(
    attendanceContent,
    /await db\.run\("DELETE FROM attendance_records WHERE id = \?", \[id\]\);\s*res\.json\({ success: true/,
    'attendance_deleted',
    '{ id }'
);

fs.writeFileSync('/app/dist/routes/attendance.js', attendanceContent, 'utf8');
console.log('✓ attendance.js fixed');

// 4. Fix routines.js
console.log('Fixing routines.js...');
let routinesContent = fs.readFileSync('/app/dist/routes/routines.js', 'utf8');

// POST - Create/Update routine record
routinesContent = addBroadcastAfterDbOperation(
    routinesContent,
    /const record = await db\.get\("SELECT \* FROM routine_records WHERE id = \?", \[recordId\]\);\s*res\.json\({ record }\);/,
    'routine_updated',
    'record'
);

fs.writeFileSync('/app/dist/routes/routines.js', routinesContent, 'utf8');
console.log('✓ routines.js fixed');

console.log('\n✅ SUCCESS: All WebSocket broadcasts added!');
console.log('Modified files:');
console.log('  - reports.js');
console.log('  - forum.js');
console.log('  - attendance.js');
console.log('  - routines.js');
