const fs = require('fs');

const filePath = '/app/dist/routes/attendance.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Adding manual attendance route with Unicode escape sequences...');

// Check if /manual route already exists
if (content.includes("router.post('/manual'")) {
  console.log('Route already exists, skipping...');
  process.exit(0);
}

// Find where to insert (before exports)
const exportsMatch = content.match(/exports\.attendanceRoutes\s*=\s*router/);
if (!exportsMatch) {
  console.log('ERROR: Could not find exports statement');
  process.exit(1);
}

const insertPos = content.indexOf(exportsMatch[0]);

// The new route with Unicode escape sequences for Chinese characters
const newRoute = `
// POST /manual - Manual attendance entry by supervisor (with smart detection)
router.post('/manual', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { userId, date, clockIn, clockOut, reason } = req.body;
    
    // Permission check
    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER' && currentUser.role !== 'SUPERVISOR') {
      return res.status(403).json({ error: '\\u6b0a\\u9650\\u4e0d\\u8db3' });
    }
    
    // Validate required fields
    if (!userId || !date || !clockIn || !clockOut || !reason) {
      return res.status(400).json({ error: '\\u7f3a\\u5c11\\u5fc5\\u8981\\u6b04\\u4f4d' });
    }
    
    // Check if user exists
    const targetUser = await dbCall(db, 'get', 'SELECT * FROM users WHERE id = ?', [userId]);
    if (!targetUser) {
      return res.status(404).json({ error: '\\u7528\\u6236\\u4e0d\\u5b58\\u5728' });
    }
    
    // SUPERVISOR permission check
    if (currentUser.role === 'SUPERVISOR') {
      if (targetUser.department !== currentUser.department) {
        return res.status(403).json({ error: '\\u53ea\\u80fd\\u70ba\\u540c\\u90e8\\u9580\\u4e0b\\u5c6c\\u88dc\\u767b' });
      }
      if (targetUser.role !== 'EMPLOYEE') {
        return res.status(403).json({ error: '\\u53ea\\u80fd\\u70ba\\u4e00\\u822c\\u54e1\\u5de5\\u88dc\\u767b' });
      }
    }
    
    // Check for existing record
    const existing = await dbCall(db, 'get', 'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?', [userId, date]);
    
    if (existing) {
      // Check if record already has clock_out
      if (existing.clock_out) {
        return res.status(400).json({ error: '\\u8a72\\u65e5\\u671f\\u5df2\\u6709\\u5b8c\\u6574\\u6253\\u5361\\u8a18\\u9304' });
      }
      
      // Record exists but no clock_out - UPDATE mode
      console.log('[Manual Attendance] Updating existing record:', existing.id);
      
      const clockOutTime = new Date(date + 'T' + clockOut);
      const clockInTime = new Date(existing.clock_in);
      const durationMs = clockOutTime - clockInTime;
      const durationMinutes = Math.floor(durationMs / 1000 / 60);
      const workHours = (durationMinutes / 60).toFixed(2);
      const now = new Date().toISOString();
      
      // Update existing record
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
    
    // Insert new record
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
    res.status(500).json({ error: '\\u4f3a\\u670d\\u5668\\u5167\\u90e8\\u932f\\u8aa4' });
  }
});

`;

// Insert before exports
content = content.substring(0, insertPos) + newRoute + content.substring(insertPos);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Added manual attendance route');
