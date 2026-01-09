const fs = require('fs');

const filePath = '/app/dist/routes/routines.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing routines.js /history route...');

// Remove the incorrectly added history route
content = content.replace(/\n\/\/ GET \/history - Get routine history[\s\S]*?res\.status\(500\)\.json\(\{ error: 'Internal server error' \}\);[\s\S]*?\}\);/m, '');

console.log('Removed old history route');

// Find the end of the /today route
const todayRouteEnd = content.indexOf('router.post(\'/records/:id/toggle\'');

if (todayRouteEnd === -1) {
  console.log('ERROR: Could not find toggle route');
  process.exit(1);
}

// Insert the history route before the toggle route
const historyRoute = `
// GET /history - Get routine history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;
    const userDept = req.user.department;
    
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
});

`;

content = content.substring(0, todayRouteEnd) + historyRoute + content.substring(todayRouteEnd);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed /history route');
