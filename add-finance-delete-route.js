const fs = require('fs');

console.log('=== Adding Finance DELETE Route ===\n');

const filePath = '/app/dist/routes/finance.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Original file size:', content.length, 'bytes');

// Find the position before exports.financeRoutes
const exportsPos = content.indexOf('exports.financeRoutes = router;');

if (exportsPos === -1) {
  console.log('ERROR: Could not find exports statement');
  process.exit(1);
}

// DELETE route to add
const deleteRoute = `
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    
    await FinanceService.deleteRecord(db, id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete finance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

`;

// Insert DELETE route before exports
content = content.slice(0, exportsPos) + deleteRoute + content.slice(exportsPos);

fs.writeFileSync(filePath, content, 'utf8');

console.log('Modified file size:', content.length, 'bytes');
console.log('+ Added DELETE /:id route');
console.log('SUCCESS: Finance DELETE route added');
