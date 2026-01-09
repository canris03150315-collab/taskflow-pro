const fs = require('fs');

const filePath = '/app/dist/routes/attendance.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing PUT /manual/:id status update...');

// Find and fix the PUT UPDATE statement
const oldPutUpdate = `'UPDATE attendance_records SET clock_in = ?, clock_out = ?, duration_minutes = ?, work_hours = ?, manual_reason = ?, manual_at = ? WHERE id = ?'`;

const newPutUpdate = `'UPDATE attendance_records SET clock_in = ?, clock_out = ?, duration_minutes = ?, work_hours = ?, status = ?, manual_reason = ?, manual_at = ? WHERE id = ?'`;

content = content.replace(oldPutUpdate, newPutUpdate);

// Add 'OFFLINE' to the parameters array for PUT route
// Need to find the specific line with the parameters
const oldPutParams = `[newClockIn, newClockOut, durationMinutes, workHours, reason || existing.manual_reason, now, id]`;

const newPutParams = `[newClockIn, newClockOut, durationMinutes, workHours, 'OFFLINE', reason || existing.manual_reason, now, id]`;

content = content.replace(oldPutParams, newPutParams);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed PUT manual attendance status update');
console.log('Now editing manual records will set status to OFFLINE');
