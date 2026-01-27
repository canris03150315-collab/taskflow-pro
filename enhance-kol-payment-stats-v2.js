const fs = require('fs');

const filePath = '/app/dist/routes/kol.js';
let content = fs.readFileSync(filePath, 'utf8');

// Find the payment-stats route and replace it
const routeStart = "// GET /payment-stats - Get payment statistics";
const routeEnd = "});";

const startIndex = content.indexOf(routeStart);
if (startIndex === -1) {
  console.log('ERROR: Could not find payment-stats route');
  process.exit(1);
}

// Find the end of this route (next route or end of file)
let endIndex = startIndex;
let braceCount = 0;
let inRoute = false;

for (let i = startIndex; i < content.length; i++) {
  if (content.substring(i, i + 13) === 'router.get(\'/') {
    inRoute = true;
  }
  
  if (inRoute) {
    if (content[i] === '{') braceCount++;
    if (content[i] === '}') braceCount--;
    
    if (braceCount === 0 && content.substring(i, i + 3) === '});') {
      endIndex = i + 3;
      break;
    }
  }
}

const oldRoute = content.substring(startIndex, endIndex);

const newRoute = `// GET /payment-stats - Get payment statistics (Enhanced)
router.get('/payment-stats', authenticateToken, checkKOLPermission, async (req, res) => {
  try {
    const db = req.db;
    const { startDate, endDate, departmentId } = req.query;

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

    if (departmentId) {
      query += ' AND kol_id IN (SELECT id FROM kol_profiles WHERE department_id = ?)';
      params.push(departmentId);
    }

    const result = dbCall(db, 'prepare', query).get(...params);
    const total = result.total || 0;
    const count = result.count || 0;
    const average = count > 0 ? Math.round(total / count) : 0;

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
      total: total,
      count: count,
      average: average,
      byKol: byKol.map(function(item) {
        return {
          kolId: item.kol_id,
          platformId: item.platform_id,
          total: item.total
        };
      })
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
})`;

content = content.substring(0, startIndex) + newRoute + content.substring(endIndex);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Enhanced payment-stats API with department filter and detailed statistics');
