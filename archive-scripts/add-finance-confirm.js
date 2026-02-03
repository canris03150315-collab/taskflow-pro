const fs = require('fs');

console.log('=== Adding Finance Confirm Endpoint ===\n');

const routePath = '/app/dist/routes/finance.js';
let content = fs.readFileSync(routePath, 'utf8');

console.log('Step 1: Finding insertion point after PUT /:id...');

const lines = content.split('\n');
let insertIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("router.put('/:id'")) {
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].includes('});') && lines[j].trim() === '});') {
        insertIdx = j + 1;
        break;
      }
    }
    break;
  }
}

if (insertIdx === -1) {
  console.log('  ERROR: Cannot find insertion point');
  process.exit(1);
}

console.log(`  Found insertion point at line ${insertIdx + 1}`);

console.log('\nStep 2: Adding confirm endpoint...');

const confirmEndpoint = `
router.post('/:id/confirm', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;

    const existing = dbCall(db, 'prepare',
      'SELECT * FROM finance WHERE id = ?'
    ).get(id);

    if (!existing) {
      return res.status(404).json({ error: '\\u8a18\\u9304\\u4e0d\\u5b58\\u5728' });
    }

    dbCall(db, 'prepare',
      'UPDATE finance SET status = ?, updated_at = ? WHERE id = ?'
    ).run('COMPLETED', new Date().toISOString(), id);

    res.json({
      success: true,
      message: '\\u78ba\\u8a8d\\u6210\\u529f'
    });

  } catch (error) {
    console.error('Confirm finance error:', error);
    res.status(500).json({ error: '\\u78ba\\u8a8d\\u5931\\u6557' });
  }
});
`;

lines.splice(insertIdx, 0, confirmEndpoint);

const newContent = lines.join('\n');
fs.writeFileSync(routePath, newContent, 'utf8');

console.log('  Confirm endpoint added');

console.log('\nStep 3: Verifying...');
const verify = fs.readFileSync(routePath, 'utf8');
const hasConfirm = verify.includes("router.post('/:id/confirm'");

console.log(`  - POST /:id/confirm: ${hasConfirm}`);

if (hasConfirm) {
  console.log('\n  Verification PASSED');
} else {
  console.log('\n  Verification FAILED');
  process.exit(1);
}

console.log('\n=== Fix Complete ===');
