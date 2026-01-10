const fs = require('fs');

const filePath = '/app/dist/routes/routines.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('=== 修復 /today 路由：自動創建今日記錄 ===');

// 找到 GET /today 路由並修改
// 在返回 null 之前，檢查是否有每日任務模板，如果有就自動創建記錄

const oldPattern = /router\.get\('\/today',\s*authenticateToken,\s*async\s*\(req,\s*res\)\s*=>\s*\{[\s\S]*?\}\);/;

const newRoute = `router.get('/today', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    const userId = currentUser.id;
    const userDept = currentUser.department;
    const today = new Date().toISOString().split('T')[0];

    // 查詢今日記錄
    let existing = await dbCall(db, 'get', 
      'SELECT * FROM routine_records WHERE user_id = ? AND date = ? AND department_id = ?',
      [userId, today, userDept]
    );

    // 如果沒有記錄，檢查是否有每日任務模板
    if (!existing) {
      const templates = await dbCall(db, 'all',
        'SELECT * FROM routine_templates WHERE department_id = ? AND is_daily = 1',
        [userDept]
      );

      if (templates && templates.length > 0) {
        // 自動創建今日記錄
        const template = templates[0];
        const recordId = 'routine-' + Date.now();
        const items = JSON.parse(template.items || '[]').map(text => ({ text, completed: false }));

        await dbCall(db, 'run',
          'INSERT INTO routine_records (id, user_id, department_id, template_id, date, items) VALUES (?, ?, ?, ?, ?, ?)',
          [recordId, userId, userDept, template.id, today, JSON.stringify(items)]
        );

        existing = {
          id: recordId,
          user_id: userId,
          department_id: userDept,
          template_id: template.id,
          date: today,
          items: JSON.stringify(items)
        };
      }
    }

    if (!existing) {
      return res.json(null);
    }

    // 解析並返回
    const record = {
      id: existing.id,
      userId: existing.user_id,
      templateId: existing.template_id,
      date: existing.date,
      items: JSON.parse(existing.items || '[]'),
      completedAt: existing.completed_at
    };

    res.json(record);
  } catch (error) {
    console.error('Error in GET /today:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});`;

if (oldPattern.test(content)) {
  content = content.replace(oldPattern, newRoute);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ SUCCESS: 已修復 /today 路由，現在會自動創建今日記錄');
} else {
  console.log('❌ ERROR: 找不到 /today 路由');
}
