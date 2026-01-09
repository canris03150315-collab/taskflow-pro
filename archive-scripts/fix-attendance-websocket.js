const fs = require('fs');

console.log('Adding WebSocket broadcasts to attendance.js...\n');

let content = fs.readFileSync('/app/dist/routes/attendance.js', 'utf8');

// 1. Fix POST /manual - UPDATE mode (existing record)
console.log('Fixing POST /manual - UPDATE mode...');
content = content.replace(
    /(const updated = await dbCall\(db, 'get', 'SELECT \* FROM attendance_records WHERE id = \?', \[existing\.id\]\);)\s*(return res\.json\({)/,
    `$1
    
    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('attendance_updated', {
        id: updated.id,
        userId: updated.user_id,
        date: updated.date,
        clockIn: updated.clock_in,
        clockOut: updated.clock_out,
        durationMinutes: updated.duration_minutes,
        status: updated.status
      });
    }
    
    $2`
);

// 2. Fix POST /manual - CREATE mode (new record)
console.log('Fixing POST /manual - CREATE mode...');
content = content.replace(
    /(const record = await dbCall\(db, 'get', 'SELECT \* FROM attendance_records WHERE id = \?', \[id\]\);)\s*(res\.json\({)/,
    `$1
    
    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('attendance_created', {
        id: record.id,
        userId: record.user_id,
        date: record.date,
        clockIn: record.clock_in,
        clockOut: record.clock_out,
        durationMinutes: record.duration_minutes,
        status: record.status
      });
    }
    
    $2`
);

// 3. Fix PUT /manual/:id - Update manual entry
console.log('Fixing PUT /manual/:id...');
content = content.replace(
    /(const updated = await dbCall\(db, 'get', 'SELECT \* FROM attendance_records WHERE id = \?', \[id\]\);)\s*(res\.json\({ success: true, record: updated }\);)/g,
    `$1
    
    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('attendance_updated', {
        id: updated.id,
        userId: updated.user_id,
        date: updated.date,
        clockIn: updated.clock_in,
        clockOut: updated.clock_out,
        durationMinutes: updated.duration_minutes,
        status: updated.status
      });
    }
    
    $2`
);

// 4. Fix DELETE /:id - Delete attendance
console.log('Fixing DELETE /:id...');
content = content.replace(
    /(await dbCall\(db, 'run', 'DELETE FROM attendance_records WHERE id = \?', \[id\]\);)\s*(res\.json\({ success: true)/g,
    `$1
    
    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('attendance_deleted', { id });
    }
    
    $2`
);

// 5. Fix POST /clock-in
console.log('Fixing POST /clock-in...');
content = content.replace(
    /(const record = await dbCall\(db, 'get', 'SELECT \* FROM attendance_records WHERE id = \?', \[id\]\);)\s*(res\.json\({ record }\);)/g,
    `$1
    
    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('attendance_created', {
        id: record.id,
        userId: record.user_id,
        date: record.date,
        clockIn: record.clock_in,
        status: record.status
      });
    }
    
    $2`
);

// 6. Fix POST /clock-out
console.log('Fixing POST /clock-out...');
const clockOutPattern = /const updated = await dbCall\(db, 'get', 'SELECT \* FROM attendance_records WHERE id = \?', \[id\]\);[\s\S]*?res\.json\({ record: updated }\);/;
if (content.match(clockOutPattern)) {
    content = content.replace(
        clockOutPattern,
        (match) => {
            if (match.includes('broadcastToAll')) {
                return match; // Already has broadcast
            }
            return match.replace(
                /(const updated = await dbCall\(db, 'get', 'SELECT \* FROM attendance_records WHERE id = \?', \[id\]\);)\s*(res\.json\({ record: updated }\);)/,
                `$1
    
    // Broadcast WebSocket event
    if (req.wsServer) {
      req.wsServer.broadcastToAll('attendance_updated', {
        id: updated.id,
        userId: updated.user_id,
        date: updated.date,
        clockIn: updated.clock_in,
        clockOut: updated.clock_out,
        durationMinutes: updated.duration_minutes,
        status: updated.status
      });
    }
    
    $2`
            );
        }
    );
}

fs.writeFileSync('/app/dist/routes/attendance.js', content, 'utf8');

console.log('\n✅ SUCCESS: WebSocket broadcasts added to attendance.js!');
console.log('\nModified routes:');
console.log('  - POST /manual (UPDATE mode)');
console.log('  - POST /manual (CREATE mode)');
console.log('  - PUT /manual/:id');
console.log('  - DELETE /:id');
console.log('  - POST /clock-in');
console.log('  - POST /clock-out');
