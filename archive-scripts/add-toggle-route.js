const fs = require('fs');

const filePath = '/app/dist/routes/routines.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('=== Add toggle route ===');

// Find where to insert (before module.exports)
const insertPosition = content.lastIndexOf('module.exports');

if (insertPosition === -1) {
  console.log('ERROR: Could not find module.exports');
  process.exit(1);
}

const toggleRoute = `
router.post('/records/:recordId/toggle', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { recordId } = req.params;
    const { index, isCompleted } = req.body;
    
    const record = await dbCall(db, 'get', 'SELECT * FROM routine_records WHERE id = ?', [recordId]);
    
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    const items = JSON.parse(record.completed_items || '[]');
    
    if (index < 0 || index >= items.length) {
      return res.status(400).json({ error: 'Invalid index' });
    }
    
    items[index].completed = isCompleted;
    
    await dbCall(db, 'run', 
      'UPDATE routine_records SET completed_items = ? WHERE id = ?',
      [JSON.stringify(items), recordId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error in toggle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

`;

// Insert before module.exports
content = content.slice(0, insertPosition) + toggleRoute + content.slice(insertPosition);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Added toggle route');
