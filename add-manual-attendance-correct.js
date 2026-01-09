const fs = require('fs');

const filePath = '/app/dist/routes/attendance.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Adding manual attendance route with CORRECT dbCall syntax...');

// Check if /manual route already exists
if (content.includes("router.post('/manual'")) {
  console.log('Route already exists, removing old version first...');
  // Find and remove old route
  const startIdx = content.indexOf("router.post('/manual'");
  let endIdx = content.indexOf("router.", startIdx + 1);
  if (endIdx === -1) endIdx = content.indexOf("exports.", startIdx);
  if (endIdx === -1) endIdx = content.length;
  content = content.substring(0, startIdx) + content.substring(endIdx);
}

// Find where to insert (before exports)
const exportsMatch = content.match(/exports\.attendanceRoutes\s*=\s*router/);
if (!exportsMatch) {
  console.log('ERROR: Could not find exports statement');
  process.exit(1);
}

const insertPos = content.indexOf(exportsMatch[0]);

// The new route with CORRECT dbCall syntax
const newRoute = `
// POST /manual - Manual attendance entry by supervisor (with smart detection)
router.post('/manual', authenticateToken, async (req, res) => {
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
    
    // Check if user exists - CORRECT dbCall syntax
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
    
    // Check for existing record - CORRECT dbCall syntax
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
      
      // Update existing record - CORRECT dbCall syntax
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
    
    // Insert new record - CORRECT dbCall syntax
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

// Insert before exports
content = content.substring(0, insertPos) + newRoute + content.substring(insertPos);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Added manual attendance route with correct dbCall syntax');
