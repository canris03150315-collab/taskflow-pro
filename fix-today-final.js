const fs = require('fs');

const routinesPath = '/app/dist/routes/routines.js';
let content = fs.readFileSync(routinesPath, 'utf8');

const insertPosition = content.indexOf('router.get(\'/today\'');
if (insertPosition === -1) {
  console.error('Cannot find /today route');
  process.exit(1);
}

const endPosition = content.indexOf('module.exports', insertPosition);
const beforeRoute = content.substring(0, insertPosition);
const afterRoute = content.substring(endPosition);

const newTodayRoute = `router.get('/today', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.id;
    const userDept = req.user.department;
    const today = new Date().toISOString().split('T')[0];
    
    let record = dbCall(db, 'prepare', 'SELECT * FROM routine_records WHERE user_id = ? AND date = ?').get(userId, today);
    
    if (!record) {
      const dailyTemplates = dbCall(db, 'prepare', 'SELECT * FROM routine_templates WHERE is_daily = 1 AND department_id = ?').all(userDept);
      
      if (dailyTemplates.length > 0) {
        const template = dailyTemplates[0];
        const items = JSON.parse(template.items || '[]');
        const completedItems = items.map(() => false);
        
        const recordId = 'record-' + Date.now();
        const createdAt = new Date().toISOString();
        
        dbCall(db, 'prepare', 'INSERT INTO routine_records (id, template_id, user_id, department_id, date, completed_items, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          recordId, template.id, userId, userDept, today, JSON.stringify(completedItems), createdAt
        );
        
        record = {
          id: recordId,
          template_id: template.id,
          user_id: userId,
          department_id: userDept,
          date: today,
          completed_items: JSON.stringify(completedItems),
          created_at: createdAt
        };
      }
    }
    
    if (record) {
      const template = dbCall(db, 'prepare', 'SELECT * FROM routine_templates WHERE id = ?').get(record.template_id);
      const items = JSON.parse(template.items || '[]');
      const completedItems = JSON.parse(record.completed_items || '[]');
      
      res.json({
        id: record.id,
        templateId: record.template_id,
        userId: record.user_id,
        departmentId: record.department_id,
        date: record.date,
        items: items.map((text, index) => ({ text: text, completed: completedItems[index] || false })),
        createdAt: record.created_at
      });
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error('Get today record error:', error);
    res.status(500).json({ error: '\\u4f3a\\u670d\\u5668\\u5167\\u90e8\\u932f\\u8aa4' });
  }
});

`;

const newContent = beforeRoute + newTodayRoute + '\n' + afterRoute;
fs.writeFileSync(routinesPath, newContent, 'utf8');
console.log('✅ Fixed GET /today route');
