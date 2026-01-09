const fs = require('fs');
const path = '/app/dist/routes/announcements.js';

console.log('Adding markRead route to announcements.js...');

let content = fs.readFileSync(path, 'utf8');

// 在 DELETE 路由之前添加 POST /:id/read 路由
const deleteRoutePattern = `router.delete('/:id', auth_1.authenticateToken, async (req, res) => {`;

const markReadRoute = `router.post('/:id/read', auth_1.authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const { userId } = req.body;

    const announcement = dbCall(db, 'prepare', 'SELECT * FROM announcements WHERE id = ?').get(id);
    if (!announcement) {
      return res.status(404).json({ error: '\\u516c\\u544a\\u4e0d\\u5b58\\u5728' });
    }

    let readBy = [];
    try {
      readBy = announcement.read_by ? JSON.parse(announcement.read_by) : [];
    } catch (e) {
      readBy = [];
    }

    if (!readBy.includes(userId)) {
      readBy.push(userId);
      const readByJson = JSON.stringify(readBy);
      dbCall(db, 'prepare', 'UPDATE announcements SET read_by = ? WHERE id = ?').run(readByJson, id);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: '\\u4f3a\\u670d\\u5668\\u5167\\u90e8\\u932f\\u8aa4' });
  }
});

${deleteRoutePattern}`;

if (content.includes(deleteRoutePattern)) {
    content = content.replace(deleteRoutePattern, markReadRoute);
    fs.writeFileSync(path, content, 'utf8');
    console.log('SUCCESS: Added POST /:id/read route before DELETE route');
} else {
    console.log('ERROR: Could not find DELETE route pattern');
    process.exit(1);
}

console.log('Done!');
