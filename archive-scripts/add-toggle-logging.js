const fs = require('fs');

const filePath = '/app/dist/routes/routines.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('=== Add detailed logging to toggle route ===');

// Find and replace the toggle route with logging version
const oldToggle = /router\.post\('\/records\/:recordId\/toggle', authenticateToken, async \(req, res\) => \{[\s\S]*?\}\);/;

const newToggle = `router.post('/records/:recordId/toggle', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { recordId } = req.params;
    const { index, isCompleted } = req.body;
    
    console.log('[Toggle] Request received:', { recordId, index, isCompleted });
    
    const record = await dbCall(db, 'get', 'SELECT * FROM routine_records WHERE id = ?', [recordId]);
    
    if (!record) {
      console.log('[Toggle] ERROR: Record not found:', recordId);
      return res.status(404).json({ error: 'Record not found' });
    }
    
    console.log('[Toggle] Record found, current completed_items:', record.completed_items);
    
    const items = JSON.parse(record.completed_items || '[]');
    console.log('[Toggle] Parsed items:', JSON.stringify(items));
    
    if (index < 0 || index >= items.length) {
      console.log('[Toggle] ERROR: Invalid index:', index, 'length:', items.length);
      return res.status(400).json({ error: 'Invalid index' });
    }
    
    console.log('[Toggle] Before update - item[' + index + ']:', JSON.stringify(items[index]));
    items[index].completed = isCompleted;
    console.log('[Toggle] After update - item[' + index + ']:', JSON.stringify(items[index]));
    
    const updatedItemsStr = JSON.stringify(items);
    console.log('[Toggle] Updating database with:', updatedItemsStr);
    
    await dbCall(db, 'run', 
      'UPDATE routine_records SET completed_items = ? WHERE id = ?',
      [updatedItemsStr, recordId]
    );
    
    console.log('[Toggle] Database updated successfully');
    
    // Verify update
    const verify = await dbCall(db, 'get', 'SELECT completed_items FROM routine_records WHERE id = ?', [recordId]);
    console.log('[Toggle] Verification - DB now contains:', verify.completed_items);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[Toggle] ERROR:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});`;

if (oldToggle.test(content)) {
  content = content.replace(oldToggle, newToggle);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Added detailed logging to toggle route');
} else {
  console.log('ERROR: Could not find toggle route');
}
