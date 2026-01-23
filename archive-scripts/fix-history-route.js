const fs = require('fs');

const filePath = '/app/dist/routes/routines.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('=== Fix /routines/history route ===\n');

// Find and replace the history route
const oldPattern = /router\.get\('\/history', authenticateToken, async \(req, res\) => \{[\s\S]*?\}\);/;

const newRoute = `router.get('/history', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];

    let records;
    
    // BOSS and MANAGER can see all records, others only see their own
    if (currentUser.role === 'BOSS' || currentUser.role === 'MANAGER') {
      records = dbCall(db, 'prepare',
        'SELECT * FROM routine_records WHERE date >= ? ORDER BY date DESC'
      ).all(startDate);
    } else if (currentUser.role === 'SUPERVISOR') {
      // SUPERVISOR sees their department's records
      records = dbCall(db, 'prepare',
        'SELECT * FROM routine_records WHERE department_id = ? AND date >= ? ORDER BY date DESC'
      ).all(currentUser.department, startDate);
    } else {
      // Regular employees see only their own
      records = dbCall(db, 'prepare',
        'SELECT * FROM routine_records WHERE user_id = ? AND date >= ? ORDER BY date DESC'
      ).all(currentUser.id, startDate);
    }

    const mappedRecords = records.map(r => ({
      id: r.id,
      user_id: r.user_id,
      department_id: r.department_id,
      date: r.date,
      items: JSON.parse(r.completed_items || '[]')
    }));

    res.json({ records: mappedRecords });
  } catch (error) {
    console.error('Get routine history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});`;

if (oldPattern.test(content)) {
  content = content.replace(oldPattern, newRoute);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Fixed /routines/history route');
  console.log('- BOSS/MANAGER can now see all records');
  console.log('- SUPERVISOR can see department records');
  console.log('- Fixed column name: items -> completed_items');
} else {
  console.log('ERROR: Could not find history route');
}
