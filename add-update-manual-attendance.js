const fs = require('fs');

const filePath = '/app/dist/routes/attendance.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Adding PUT /manual/:id route for updating manual attendance...');

// Check if route already exists
if (content.includes("router.put('/manual/:id'")) {
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

// The new PUT route with Unicode escape for Chinese
const newRoute = `
// PUT /manual/:id - Update manual attendance record
router.put('/manual/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    const { clockIn, clockOut, reason } = req.body;
    
    // Permission check
    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER' && currentUser.role !== 'SUPERVISOR') {
      return res.status(403).json({ error: '\\u6b0a\\u9650\\u4e0d\\u8db3' });
    }
    
    // Get existing record
    const existing = await dbCall(db, 'get', 'SELECT * FROM attendance_records WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: '\\u8a18\\u9304\\u4e0d\\u5b58\\u5728' });
    }
    
    // Only allow editing manual records
    if (!existing.is_manual) {
      return res.status(400).json({ error: '\\u53ea\\u80fd\\u4fee\\u6539\\u88dc\\u767b\\u8a18\\u9304' });
    }
    
    // SUPERVISOR can only edit records for their department
    if (currentUser.role === 'SUPERVISOR') {
      const targetUser = await dbCall(db, 'get', 'SELECT * FROM users WHERE id = ?', [existing.user_id]);
      if (targetUser && targetUser.department !== currentUser.department) {
        return res.status(403).json({ error: '\\u53ea\\u80fd\\u4fee\\u6539\\u540c\\u90e8\\u9580\\u7684\\u8a18\\u9304' });
      }
    }
    
    // Calculate new duration
    const date = existing.date;
    const newClockIn = clockIn ? date + 'T' + clockIn : existing.clock_in;
    const newClockOut = clockOut ? date + 'T' + clockOut : existing.clock_out;
    
    const clockInTime = new Date(newClockIn);
    const clockOutTime = new Date(newClockOut);
    const durationMs = clockOutTime - clockInTime;
    const durationMinutes = Math.floor(durationMs / 1000 / 60);
    const workHours = (durationMinutes / 60).toFixed(2);
    const now = new Date().toISOString();
    
    // Update record
    await dbCall(db, 'run', 
      'UPDATE attendance_records SET clock_in = ?, clock_out = ?, duration_minutes = ?, work_hours = ?, manual_reason = ?, manual_at = ? WHERE id = ?',
      [newClockIn, newClockOut, durationMinutes, workHours, reason || existing.manual_reason, now, id]
    );
    
    const updated = await dbCall(db, 'get', 'SELECT * FROM attendance_records WHERE id = ?', [id]);
    
    res.json({
      success: true,
      record: {
        id: updated.id,
        userId: updated.user_id,
        date: updated.date,
        clockIn: updated.clock_in,
        clockOut: updated.clock_out,
        durationMinutes: updated.duration_minutes,
        workHours: updated.work_hours,
        status: updated.status,
        isManual: Boolean(updated.is_manual),
        manualBy: updated.manual_by,
        manualReason: updated.manual_reason,
        manualAt: updated.manual_at
      }
    });
    
  } catch (error) {
    console.error('Update manual attendance error:', error);
    res.status(500).json({ error: '\\u4f3a\\u670d\\u5668\\u5167\\u90e8\\u932f\\u8aa4' });
  }
});

`;

// Insert before exports
content = content.substring(0, insertPos) + newRoute + content.substring(insertPos);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Added PUT /manual/:id route');
