const fs = require('fs');

const filePath = '/app/dist/routes/routines.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Adding GET /history route to routines.js...');

// Find the position after the /today route
const todayRoutePattern = /router\.get\('\/today'[\s\S]*?\}\);/;

if (!todayRoutePattern.test(content)) {
  console.log('ERROR: Could not find /today route');
  process.exit(1);
}

// Add the /history route after /today
const historyRoute = `

// GET /history - Get routine history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;
    const userDept = req.user.department;
    
    // Get records from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    
    const records = dbCall(db, 'prepare', 
      'SELECT * FROM routine_records WHERE user_id = ? AND department_id = ? AND date >= ? ORDER BY date DESC'
    ).all(userId, userDept, startDate);
    
    const mappedRecords = records.map(r => ({
      id: r.id,
      user_id: r.user_id,
      department_id: r.department_id,
      date: r.date,
      items: JSON.parse(r.items || '[]')
    }));
    
    res.json({ records: mappedRecords });
  } catch (error) {
    console.error('Get routine history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});`;

// Insert after the /today route
content = content.replace(
  /(router\.get\('\/today'[\s\S]*?\}\);)/,
  '$1' + historyRoute
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Added GET /history route');
