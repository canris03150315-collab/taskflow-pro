const fs = require('fs');
const filePath = '/app/dist/routes/attendance.js';
let content = fs.readFileSync(filePath, 'utf8');

const insertPoint = "router.get('/status', authenticateToken, async (req, res) => {";
const newRoute = `// GET /api/attendance - Get attendance history
router.get('/', authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const records = await dbCall(db, 'all', 'SELECT * FROM attendance_records ORDER BY date DESC LIMIT 1000');
        res.json({ success: true, records: records || [] });
    } catch (error) {
        console.error('[Attendance V37] Get history error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

` + insertPoint;

if (content.includes(insertPoint) && !content.includes("router.get('/', authenticateToken")) {
  content = content.replace(insertPoint, newRoute);
  fs.writeFileSync(filePath, content);
  console.log('SUCCESS: Added GET / route to attendance.js');
} else if (content.includes("router.get('/', authenticateToken")) {
  console.log('INFO: GET / route already exists');
} else {
  console.log('ERROR: Insert point not found');
}
