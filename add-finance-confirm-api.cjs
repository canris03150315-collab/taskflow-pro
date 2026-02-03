const fs = require('fs');

console.log('=== Adding confirm API to finance route ===\n');

const routeFile = '/app/dist/routes/finance.js';

try {
  let content = fs.readFileSync(routeFile, 'utf8');
  
  // Check if confirm route already exists
  if (content.includes("router.post('/:id/confirm'")) {
    console.log('confirm API already exists, skipping...');
    process.exit(0);
  }
  
  // Find the position to insert the new route (before DELETE route)
  const deletePos = content.indexOf("router.delete('/:id'");
  
  if (deletePos === -1) {
    throw new Error('Cannot find DELETE route in finance.js');
  }
  
  // New route code (Pure ASCII)
  const newRoute = `
// Confirm finance record receipt
router.post('/:id/confirm', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const currentUser = req.user;
    
    const now = new Date().toISOString();
    
    // Update record status to confirmed
    const updateData = {
      status: 'CONFIRMED',
      confirmedBy: currentUser.id,
      confirmedAt: now
    };
    
    const record = await FinanceService.updateRecord(db, id, updateData);
    res.json(mapFinanceRecord(record));
    
  } catch (error) {
    console.error('Confirm finance error:', error);
    res.status(500).json({ error: '\\u78ba\\u8a8d\\u5931\\u6557' });
  }
});

`;
  
  // Insert the new route before DELETE route
  const newContent = content.slice(0, deletePos) + newRoute + content.slice(deletePos);
  
  // Write back to file
  fs.writeFileSync(routeFile, newContent, 'utf8');
  
  console.log('OK - Added confirm API route');
  console.log('Route location: POST /api/finance/:id/confirm');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}

console.log('\n=== Complete ===');
