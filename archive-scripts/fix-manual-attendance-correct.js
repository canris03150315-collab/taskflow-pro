const fs = require('fs');

const filePath = '/app/dist/routes/attendance.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing manual attendance route with CORRECT dbCall syntax...');

// The OLD /manual route we need to find and replace
// It uses: dbCall(db, 'prepare', sql).get/run() - WRONG!
// Should use: await dbCall(db, 'get/run/all', sql, [params])

// Find the entire /manual route block
const manualRouteStart = content.indexOf("router.post('/manual'");
if (manualRouteStart === -1) {
  console.log('ERROR: Could not find /manual route');
  process.exit(1);
}

// Find the end of this route (next router. or exports.)
let routeEnd = content.indexOf("router.", manualRouteStart + 1);
if (routeEnd === -1) {
  routeEnd = content.indexOf("exports.", manualRouteStart);
}
if (routeEnd === -1) {
  routeEnd = content.length;
}

// Extract old route
const oldRoute = content.substring(manualRouteStart, routeEnd);
console.log('Found old route, length:', oldRoute.length);

// Create the new corrected route with proper dbCall syntax
const newRoute = `router.post('/manual', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { userId, date, clockIn, clockOut, reason } = req.body;
    
    // Permission check
    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER' && currentUser.role !== 'SUPERVISOR') {
      return res.status(403).json({ error: '權限不足' });
    }
    
    // Validate required fields
    if (!userId || !date || !clockIn || !clockOut || !reason) {
      return res.status(400).json({ error: '缺少必要欄位' });
    }
    
    // Check if user exists - CORRECT syntax
    const targetUser = await dbCall(db, 'get', 'SELECT * FROM users WHERE id = ?', [userId]);
    if (!targetUser) {
      return res.status(404).json({ error: '用戶不存在' });
    }
    
    // SUPERVISOR permission check
    if (currentUser.role === 'SUPERVISOR') {
      if (targetUser.department !== currentUser.department) {
        return res.status(403).json({ error: '只能為同部門下屬補登' });
      }
      if (targetUser.role !== 'EMPLOYEE') {
        return res.status(403).json({ error: '只能為一般員工補登' });
      }
    }
    
    // Check for existing record - CORRECT syntax
    const existing = await dbCall(db, 'get', 'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?', [userId, date]);
    
    if (existing) {
      // Check if record already has clock_out
      if (existing.clock_out) {
        return res.status(400).json({ error: '該日期已有完整打卡記錄' });
      }
      
      // Record exists but no clock_out - UPDATE mode
      console.log('[Manual Attendance] Updating existing record:', existing.id);
      
      const clockOutTime = new Date(date + 'T' + clockOut);
      const clockInTime = new Date(existing.clock_in);
      const durationMs = clockOutTime - clockInTime;
      const durationMinutes = Math.floor(durationMs / 1000 / 60);
      const workHours = (durationMinutes / 60).toFixed(2);
      const now = new Date().toISOString();
      
      // Update existing record - CORRECT syntax
      await dbCall(db, 'run', 
        'UPDATE attendance_records SET clock_out = ?, duration_minutes = ?, work_hours = ?, status = ?, is_manual = ?, manual_by = ?, manual_reason = ?, manual_at = ? WHERE id = ?',
        [date + 'T' + clockOut, durationMinutes, workHours, 'completed', 1, currentUser.id, reason, now, existing.id]
      );
      
      const updated = await dbCall(db, 'get', 'SELECT * FROM attendance_records WHERE id = ?', [existing.id]);
      
      return res.json({
        success: true,
        mode: 'update',
        record: {
          id: updated.id,
          userId: updated.user_id,
          date: updated.date,
          clockIn: updated.clock_in,
          clockOut: updated.clock_out,
          durationMinutes: updated.duration_minutes,
          workHours: updated.work_hours,
          isManual: Boolean(updated.is_manual),
          manualBy: updated.manual_by,
          manualReason: updated.manual_reason,
          manualAt: updated.manual_at
        }
      });
    }
    
    // No existing record - CREATE mode
    const clockInTime = new Date(date + 'T' + clockIn);
    const clockOutTime = new Date(date + 'T' + clockOut);
    const durationMs = clockOutTime - clockInTime;
    const durationMinutes = Math.floor(durationMs / 1000 / 60);
    const workHours = (durationMinutes / 60).toFixed(2);
    
    const id = 'attendance-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    
    // Insert new record - CORRECT syntax
    await dbCall(db, 'run', 
      'INSERT INTO attendance_records (id, user_id, date, clock_in, clock_out, duration_minutes, work_hours, status, is_manual, manual_by, manual_reason, manual_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, userId, date, date + 'T' + clockIn, date + 'T' + clockOut, durationMinutes, workHours, 'completed', 1, currentUser.id, reason, now, now]
    );
    
    const record = await dbCall(db, 'get', 'SELECT * FROM attendance_records WHERE id = ?', [id]);
    
    res.json({
      success: true,
      mode: 'create',
      record: {
        id: record.id,
        userId: record.user_id,
        date: record.date,
        clockIn: record.clock_in,
        clockOut: record.clock_out,
        durationMinutes: record.duration_minutes,
        workHours: record.work_hours,
        isManual: Boolean(record.is_manual),
        manualBy: record.manual_by,
        manualReason: record.manual_reason,
        manualAt: record.manual_at
      }
    });
    
  } catch (error) {
    console.error('Manual attendance error:', error);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

`;

// Replace the old route with the new one
content = content.substring(0, manualRouteStart) + newRoute + content.substring(routeEnd);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed manual attendance route with correct dbCall syntax');
