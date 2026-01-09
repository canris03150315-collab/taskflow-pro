const fs = require('fs');

const filePath = '/app/dist/routes/attendance.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Carefully enhancing manual attendance route...');

// Find the existing check section
const oldCheckPattern = `    const existing = dbCall(db, 'prepare',
      'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?'
    ).get(userId, date);

    if (existing) {
      return res.status(400).json({ error: '\\u8a72\\u65e5\\u671f\\u5df2\\u6709\\u6253\\u5361\\u8a18\\u9304' });
    }`;

const newCheckPattern = `    const existing = dbCall(db, 'prepare',
      'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?'
    ).get(userId, date);

    if (existing) {
      // Check if record has clock_out
      if (existing.clock_out) {
        return res.status(400).json({ error: '\\u8a72\\u65e5\\u671f\\u5df2\\u6709\\u5b8c\\u6574\\u6253\\u5361\\u8a18\\u9304' });
      }
      
      // Record exists but no clock_out, update it
      console.log('[Manual Attendance] Updating existing record:', existing.id);
      
      const clockOutTime = new Date(date + 'T' + clockOut);
      const clockInTime = new Date(existing.clock_in);
      const durationMs = clockOutTime - clockInTime;
      const durationMinutes = Math.floor(durationMs / 1000 / 60);
      const workHours = (durationMinutes / 60).toFixed(2);
      const now = new Date().toISOString();
      
      dbCall(db, 'prepare',
        'UPDATE attendance_records SET clock_out = ?, duration_minutes = ?, work_hours = ?, status = ?, is_manual = ?, manual_by = ?, manual_reason = ?, manual_at = ? WHERE id = ?'
      ).run(
        date + 'T' + clockOut,
        durationMinutes,
        workHours,
        'completed',
        1,
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

if (content.includes(oldCheckPattern)) {
  content = content.replace(oldCheckPattern, newCheckPattern);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Enhanced manual attendance route with smart detection');
} else {
  console.log('ERROR: Could not find the exact pattern to replace');
  console.log('Searching for alternative pattern...');
  
  // Try to find the pattern with different spacing
  const alternativePattern = /const existing = dbCall\(db, 'prepare',[\s\n]*'SELECT \* FROM attendance_records WHERE user_id = \? AND date = \?'[\s\n]*\)\.get\(userId, date\);[\s\n]*if \(existing\) \{[\s\n]*return res\.status\(400\)\.json\(\{ error: '\\u8a72\\u65e5\\u671f\\u5df2\\u6709\\u6253\\u5361\\u8a18\\u9304' \}\);[\s\n]*\}/;
  
  if (alternativePattern.test(content)) {
    content = content.replace(alternativePattern, newCheckPattern);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Enhanced using alternative pattern matching');
  } else {
    console.log('ERROR: Pattern not found. Manual intervention required.');
    process.exit(1);
  }
}
