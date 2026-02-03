const fs = require('fs');

console.log('=== Adding Missing Endpoints ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(routePath, 'utf8');

console.log('Step 1: Finding insertion point...');

const moduleExportsIdx = content.indexOf('module.exports = router;');
if (moduleExportsIdx === -1) {
  console.log('  ERROR: Cannot find module.exports');
  process.exit(1);
}

console.log('  Found module.exports');

console.log('\nStep 2: Adding missing endpoints...');

const newEndpoints = `
router.get('/stats/platform', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { startDate, endDate } = req.query;

    let query = 'SELECT platform_name, SUM(lottery_amount) as lottery_amount, SUM(external_game_amount) as external_game_amount, SUM(lottery_dividend) as lottery_dividend, SUM(external_dividend) as external_dividend, SUM(private_return) as private_return, SUM(deposit_amount) as deposit_amount, SUM(withdrawal_amount) as withdrawal_amount, SUM(loan_amount) as loan_amount, SUM(profit) as profit FROM platform_transactions';
    const params = [];

    if (startDate && endDate) {
      query += ' WHERE date >= ? AND date <= ?';
      params.push(startDate, endDate);
    }

    query += ' GROUP BY platform_name ORDER BY platform_name';

    const stats = dbCall(db, 'prepare', query).all(...params);

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Platform stats error:', error);
    res.status(500).json({ error: '\\u7d71\\u8a08\\u5931\\u6557' });
  }
});

router.get('/history', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { limit = 50, offset = 0 } = req.query;

    const history = dbCall(db, 'prepare',
      'SELECT DISTINCT uploaded_by, uploaded_at, COUNT(*) as record_count FROM platform_transactions GROUP BY uploaded_by, uploaded_at ORDER BY uploaded_at DESC LIMIT ? OFFSET ?'
    ).all(parseInt(limit), parseInt(offset));

    const total = dbCall(db, 'prepare',
      'SELECT COUNT(DISTINCT uploaded_at) as count FROM platform_transactions'
    ).get();

    res.json({
      success: true,
      history: history,
      total: total.count
    });

  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: '\\u67e5\\u8a62\\u5931\\u6557' });
  }
});

`;

const beforeExport = content.substring(0, moduleExportsIdx);
const afterExport = content.substring(moduleExportsIdx);

const newContent = beforeExport + newEndpoints + afterExport;

fs.writeFileSync(routePath, newContent, 'utf8');
console.log('  Endpoints added');

console.log('\nStep 3: Verifying...');
const verify = fs.readFileSync(routePath, 'utf8');
const hasStatsPlatform = verify.includes("router.get('/stats/platform'");
const hasHistory = verify.includes("router.get('/history'");

console.log(`  - /stats/platform: ${hasStatsPlatform}`);
console.log(`  - /history: ${hasHistory}`);

if (hasStatsPlatform && hasHistory) {
  console.log('\n  Verification PASSED');
} else {
  console.log('\n  Verification FAILED');
  process.exit(1);
}

console.log('\n=== Fix Complete ===');
