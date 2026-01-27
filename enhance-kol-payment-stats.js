const fs = require('fs');

const filePath = '/app/dist/routes/kol.js';
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the payment-stats route with enhanced version
const oldRoute = `// GET /payment-stats - Get payment statistics
router.get('/payment-stats', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const { startDate, endDate } = req.query;

    let query = 'SELECT SUM(amount) as total FROM kol_weekly_payments WHERE 1=1';
    const params = [];

    if (startDate) {
      query += ' AND payment_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND payment_date <= ?';
      params.push(endDate);
    }

    const result = dbCall(db, 'prepare', query).get(...params);
    res.json({ total: result.total || 0 });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});`;

const newRoute = `// GET /payment-stats - Get payment statistics (Enhanced)
router.get('/payment-stats', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const { startDate, endDate, departmentId } = req.query;

    // Build query for total and count
    let query = 'SELECT SUM(amount) as total, COUNT(*) as count FROM kol_weekly_payments WHERE 1=1';
    const params = [];

    if (startDate) {
      query += ' AND payment_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND payment_date <= ?';
      params.push(endDate);
    }

    // Add department filter if provided
    if (departmentId) {
      query += ' AND kol_id IN (SELECT id FROM kol_profiles WHERE department_id = ?)';
      params.push(departmentId);
    }

    const result = dbCall(db, 'prepare', query).get(...params);
    const total = result.total || 0;
    const count = result.count || 0;
    const average = count > 0 ? Math.round(total / count) : 0;

    // Get by KOL breakdown
    let byKolQuery = 'SELECT p.kol_id, k.platform_id, SUM(p.amount) as total FROM kol_weekly_payments p LEFT JOIN kol_profiles k ON p.kol_id = k.id WHERE 1=1';
    const byKolParams = [];

    if (startDate) {
      byKolQuery += ' AND p.payment_date >= ?';
      byKolParams.push(startDate);
    }

    if (endDate) {
      byKolQuery += ' AND p.payment_date <= ?';
      byKolParams.push(endDate);
    }

    if (departmentId) {
      byKolQuery += ' AND k.department_id = ?';
      byKolParams.push(departmentId);
    }

    byKolQuery += ' GROUP BY p.kol_id, k.platform_id ORDER BY total DESC LIMIT 10';

    const byKol = dbCall(db, 'prepare', byKolQuery).all(...byKolParams);

    res.json({ 
      total,
      count,
      average,
      byKol: byKol.map(item => ({
        kolId: item.kol_id,
        platformId: item.platform_id,
        total: item.total
      }))
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});`;

// Replace the route
if (content.includes(oldRoute)) {
  content = content.replace(oldRoute, newRoute);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Enhanced payment-stats API with department filter and detailed statistics');
} else {
  console.log('ERROR: Could not find the exact route to replace');
  console.log('Please check if the route has been modified');
}
