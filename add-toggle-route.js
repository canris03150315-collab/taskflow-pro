const fs = require('fs');

const routinesPath = '/app/dist/routes/routines.js';
let content = fs.readFileSync(routinesPath, 'utf8');

const toggleRoute = `
router.post('/records/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const { index, isCompleted } = req.body;
    
    const record = dbCall(db, 'prepare', 'SELECT * FROM routine_records WHERE id = ?').get(id);
    
    if (!record) {
      return res.status(404).json({ error: '\\u8a18\\u9304\\u4e0d\\u5b58\\u5728' });
    }
    
    let completedItems = JSON.parse(record.completed_items || '[]');
    completedItems[index] = isCompleted;
    
    dbCall(db, 'prepare', 'UPDATE routine_records SET completed_items = ? WHERE id = ?').run(JSON.stringify(completedItems), id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Toggle item error:', error);
    res.status(500).json({ error: '\\u4f3a\\u670d\\u5668\\u5167\\u90e8\\u932f\\u8aa4' });
  }
});
`;

const insertPosition = content.indexOf('module.exports');
if (insertPosition === -1) {
  console.error('Cannot find insert position');
  process.exit(1);
}

content = content.slice(0, insertPosition) + toggleRoute + '\n' + content.slice(insertPosition);

fs.writeFileSync(routinesPath, content, 'utf8');
console.log('✅ Added toggle route');
