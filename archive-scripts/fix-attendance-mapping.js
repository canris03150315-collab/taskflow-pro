const fs = require('fs');

const filePath = '/app/dist/routes/attendance.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing attendance records field mapping...');

// Find the GET / route response
const oldResponse = `res.json({
            success: true,
            records: records || []
        });`;

const newResponse = `// Map database fields to camelCase for frontend
        const mappedRecords = (records || []).map(r => ({
            id: r.id,
            userId: r.user_id,
            date: r.date,
            clockIn: r.clock_in,
            clockOut: r.clock_out,
            durationMinutes: r.duration_minutes,
            workHours: r.work_hours,
            status: r.status,
            isManual: Boolean(r.is_manual),
            manualBy: r.manual_by,
            manualReason: r.manual_reason,
            manualAt: r.manual_at,
            createdAt: r.created_at
        }));
        
        res.json({
            success: true,
            records: mappedRecords
        });`;

if (content.includes(oldResponse)) {
  content = content.replace(oldResponse, newResponse);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Added field mapping to GET / route');
} else {
  console.log('ERROR: Could not find the response pattern');
  process.exit(1);
}
