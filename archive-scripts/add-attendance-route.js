const fs = require('fs');
const filePath = '/app/dist/routes/attendance.js';
let content = fs.readFileSync(filePath, 'utf8');

// 在 router.get('/status' 之前添加 GET / 路由
const insertPoint = "router.get('/status', authenticateToken, async (req, res) => {";
const newRoute = `// GET /api/attendance - Get attendance history
router.get('/', authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        
        // Get all attendance records
        const records = await dbCall(db, 'all',
            'SELECT * FROM attendance_records ORDER BY date DESC, clock_in DESC LIMIT 1000'
        );
        
        res.json({
            success: true,
            records: records || []
        });
    } catch (error) {
        console.error('[Attendance V37] Get history error:', error.message);
        res.status(500).json({ success: false, error: '獲取出勤記錄失敗' });
    }
});

` + insertPoint;

if (content.includes(insertPoint) && !content.includes("router.get('/', authenticateToken")) {
  content = content.replace(insertPoint, newRoute);
  fs.writeFileSync(filePath, content);
  console.log('✅ Added GET / route to attendance.js');
} else if (content.includes("router.get('/', authenticateToken")) {
  console.log('✅ GET / route already exists');
} else {
  console.log('❌ Insert point not found');
  console.log('Looking for:', insertPoint.substring(0, 50));
}
