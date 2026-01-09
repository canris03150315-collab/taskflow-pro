const fs = require('fs');

const filePath = '/app/dist/routes/attendance.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Adding manual attendance route...');

// Find the position before module.exports
const exportsPattern = /module\.exports = \{ attendanceRoutes: router \};/;

if (!exportsPattern.test(content)) {
  console.log('ERROR: Could not find module.exports');
  process.exit(1);
}

// Add the manual attendance route
const manualRoute = `
// POST /manual - Manual attendance entry by supervisor
router.post('/manual', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { userId, date, clockIn, clockOut, reason } = req.body;
    
    // Permission check: Only BOSS, MANAGER, or SUPERVISOR can manually add attendance
    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER' && currentUser.role !== 'SUPERVISOR') {
      return res.status(403).json({ error: '\\u6b0a\\u9650\\u4e0d\\u8db3' });
    }
    
    // Validate required fields
    if (!userId || !date || !clockIn || !clockOut || !reason) {
      return res.status(400).json({ error: '\\u7f3a\\u5c11\\u5fc5\\u8981\\u6b04\\u4f4d' });
    }
    
    // Check if user exists
    const targetUser = dbCall(db, 'prepare', 'SELECT * FROM users WHERE id = ?').get(userId);
    if (!targetUser) {
      return res.status(404).json({ error: '\\u7528\\u6236\\u4e0d\\u5b58\\u5728' });
    }
    
    // For SUPERVISOR, can only add for subordinates in same department
    if (currentUser.role === 'SUPERVISOR') {
      if (targetUser.department !== currentUser.department) {
        return res.status(403).json({ error: '\\u53ea\\u80fd\\u70ba\\u540c\\u90e8\\u9580\\u4e0b\\u5c6c\\u88dc\\u767b' });
      }
      if (targetUser.role !== 'EMPLOYEE') {
        return res.status(403).json({ error: '\\u53ea\\u80fd\\u70ba\\u4e00\\u822c\\u54e1\\u5de5\\u88dc\\u767b' });
      }
    }
    
    // Check if record already exists for this date
    const existing = dbCall(db, 'prepare', 
      'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?'
    ).get(userId, date);
    
    if (existing) {
      return res.status(400).json({ error: '\\u8a72\\u65e5\\u671f\\u5df2\\u6709\\u6253\\u5361\\u8a18\\u9304' });
    }
    
    // Calculate duration
    const clockInTime = new Date(date + 'T' + clockIn);
    const clockOutTime = new Date(date + 'T' + clockOut);
    const durationMs = clockOutTime - clockInTime;
    const durationMinutes = Math.floor(durationMs / 1000 / 60);
    const workHours = (durationMinutes / 60).toFixed(2);
    
    // Create record
    const id = 'attendance-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    
    dbCall(db, 'prepare', \`
      INSERT INTO attendance_records (
        id, user_id, date, clock_in, clock_out, 
        duration_minutes, work_hours, status,
        is_manual, manual_by, manual_reason, manual_at,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    \`).run(
      id, userId, date, date + 'T' + clockIn, date + 'T' + clockOut,
      durationMinutes, workHours, 'completed',
      1, currentUser.id, reason, now,
      now
    );
    
    const record = dbCall(db, 'prepare', 'SELECT * FROM attendance_records WHERE id = ?').get(id);
    
    res.json({
      success: true,
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

// Insert before module.exports
content = content.replace(exportsPattern, manualRoute + '\nmodule.exports = { attendanceRoutes: router };');

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Added manual attendance route');
