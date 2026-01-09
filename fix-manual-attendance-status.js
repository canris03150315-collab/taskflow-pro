const fs = require('fs');

const filePath = '/app/dist/routes/attendance.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing manual attendance UPDATE mode status...');

// Find and fix the UPDATE statement to include status = OFFLINE
const oldUpdate = `'UPDATE attendance_records SET clock_out = ?, duration_minutes = ?, work_hours = ?, is_manual = ?, manual_by = ?, manual_reason = ?, manual_at = ? WHERE id = ?'`;

const newUpdate = `'UPDATE attendance_records SET clock_out = ?, duration_minutes = ?, work_hours = ?, status = ?, is_manual = ?, manual_by = ?, manual_reason = ?, manual_at = ? WHERE id = ?'`;

content = content.replace(oldUpdate, newUpdate);

// Also need to add 'OFFLINE' to the parameters array
const oldParams = `[date + 'T' + clockOut, durationMinutes, workHours, 1, currentUser.id, reason, now, existing.id]`;

const newParams = `[date + 'T' + clockOut, durationMinutes, workHours, 'OFFLINE', 1, currentUser.id, reason, now, existing.id]`;

content = content.replace(oldParams, newParams);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed manual attendance status update');
console.log('Now UPDATE mode will set status to OFFLINE when clock_out is added');
