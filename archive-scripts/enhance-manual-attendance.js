const fs = require('fs');

const filePath = '/app/dist/routes/attendance.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Enhancing manual attendance to support clock-out only...');

// Find the manual attendance route
const routeStart = content.indexOf('router.post(\'/manual\', authenticateToken, async (req, res) => {');

if (routeStart === -1) {
  console.log('ERROR: Could not find manual attendance route');
  process.exit(1);
}

// Find the section where we check for existing records
const existingCheckPattern = /const existing = dbCall\(db, 'prepare',[\s\S]*?\)\.get\(userId, date\);[\s\S]*?if \(existing\) \{[\s\S]*?return res\.status\(400\)\.json\(\{ error: '[^']*' \}\);[\s\S]*?\}/;

const enhancedCheck = `const existing = dbCall(db, 'prepare', 
      'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?'
    ).get(userId, date);
    
    if (existing) {
      // If record exists, check if it's complete
      if (existing.clock_out) {
        return res.status(400).json({ error: '\\u8a72\\u65e5\\u671f\\u5df2\\u6709\\u5b8c\\u6574\\u6253\\u5361\\u8a18\\u9304' });
      }
      
      // Record exists but no clock_out, update it
      console.log('Updating existing record with clock-out:', existing.id);
      
      const clockOutTime = new Date(date + 'T' + clockOut);
      const clockInTime = new Date(existing.clock_in);
      const durationMs = clockOutTime - clockInTime;
      const durationMinutes = Math.floor(durationMs / 1000 / 60);
      const workHours = (durationMinutes / 60).toFixed(2);
      const now = new Date().toISOString();
      
      dbCall(db, 'prepare', \`
        UPDATE attendance_records 
        SET clock_out = ?, 
            duration_minutes = ?, 
            work_hours = ?,
            status = 'completed',
            is_manual = 1,
            manual_by = ?,
            manual_reason = ?,
            manual_at = ?
        WHERE id = ?
      \`).run(
        date + 'T' + clockOut,
        durationMinutes,
        workHours,
        currentUser.id,
        reason,
        now,
        existing.id
      );
      
      const updated = dbCall(db, 'prepare', 'SELECT * FROM attendance_records WHERE id = ?').get(existing.id);
      
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
    }`;

if (existingCheckPattern.test(content)) {
  content = content.replace(existingCheckPattern, enhancedCheck);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Enhanced manual attendance route');
} else {
  console.log('ERROR: Could not find existing check pattern');
  process.exit(1);
}
