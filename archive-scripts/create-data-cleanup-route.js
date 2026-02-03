const fs = require('fs');

const routeContent = `const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// \\u9810\\u89bd\\u5c07\\u522a\\u9664\\u7684\\u8cc7\\u6599
router.post('/preview', authenticateToken, async (req, res) => {
  try {
    const { months, categories } = req.body;
    const currentUser = req.user;
    const db = req.db;

    // \\u6b0a\\u9650\\u6aa2\\u67e5\\uff1a\\u53ea\\u6709 BOSS \\u53ef\\u4ee5\\u4f7f\\u7528
    if (currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: '\\u6b0a\\u9650\\u4e0d\\u8db3\\uff0c\\u50c5 BOSS \\u53ef\\u4f7f\\u7528\\u6b64\\u529f\\u80fd' });
    }

    if (!months || !categories || !Array.isArray(categories)) {
      return res.status(400).json({ error: '\\u7f3a\\u5c11\\u5fc5\\u8981\\u53c3\\u6578' });
    }

    // \\u8a08\\u7b97\\u622a\\u6b62\\u65e5\\u671f
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    const counts = {};

    // \\u67e5\\u8a62\\u5404\\u985e\\u5225\\u7684\\u8cc7\\u6599\\u6578\\u91cf
    for (const category of categories) {
      let query = '';
      let params = [cutoffDateStr];

      switch (category) {
        case 'tasks':
          query = "SELECT COUNT(*) as count FROM tasks WHERE created_at < ?";
          break;
        case 'leave_requests':
          query = "SELECT COUNT(*) as count FROM leave_requests WHERE created_at < ?";
          break;
        case 'schedules':
          query = "SELECT COUNT(*) as count FROM schedules WHERE date < ?";
          break;
        case 'attendance':
          query = "SELECT COUNT(*) as count FROM attendance_records WHERE date < ?";
          break;
        case 'routines':
          query = "SELECT COUNT(*) as count FROM routine_records WHERE date < ?";
          break;
        case 'finance':
          query = "SELECT COUNT(*) as count FROM finance WHERE created_at < ?";
          break;
        case 'announcements':
          query = "SELECT COUNT(*) as count FROM announcements WHERE created_at < ?";
          break;
        case 'suggestions':
          query = "SELECT COUNT(*) as count FROM suggestions WHERE created_at < ?";
          break;
        case 'reports':
          query = "SELECT COUNT(*) as count FROM reports WHERE created_at < ?";
          break;
        case 'memos':
          query = "SELECT COUNT(*) as count FROM memos WHERE created_at < ?";
          break;
        default:
          continue;
      }

      try {
        const result = db.prepare(query).get(...params);
        counts[category] = result.count || 0;
      } catch (error) {
        console.error(\`Preview error for \${category}:\`, error);
        counts[category] = 0;
      }
    }

    res.json({ counts });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: '\\u9810\\u89bd\\u5931\\u6557' });
  }
});

// \\u522a\\u9664\\u8cc7\\u6599
router.post('/delete', authenticateToken, async (req, res) => {
  try {
    const { months, categories } = req.body;
    const currentUser = req.user;
    const db = req.db;

    // \\u6b0a\\u9650\\u6aa2\\u67e5\\uff1a\\u53ea\\u6709 BOSS \\u53ef\\u4ee5\\u4f7f\\u7528
    if (currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: '\\u6b0a\\u9650\\u4e0d\\u8db3\\uff0c\\u50c5 BOSS \\u53ef\\u4f7f\\u7528\\u6b64\\u529f\\u80fd' });
    }

    if (!months || !categories || !Array.isArray(categories)) {
      return res.status(400).json({ error: '\\u7f3a\\u5c11\\u5fc5\\u8981\\u53c3\\u6578' });
    }

    // \\u8a08\\u7b97\\u622a\\u6b62\\u65e5\\u671f
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    let totalDeleted = 0;
    const deletedCounts = {};

    // \\u522a\\u9664\\u5404\\u985e\\u5225\\u7684\\u8cc7\\u6599
    for (const category of categories) {
      let query = '';
      let params = [cutoffDateStr];

      switch (category) {
        case 'tasks':
          query = "DELETE FROM tasks WHERE created_at < ?";
          break;
        case 'leave_requests':
          query = "DELETE FROM leave_requests WHERE created_at < ?";
          break;
        case 'schedules':
          query = "DELETE FROM schedules WHERE date < ?";
          break;
        case 'attendance':
          query = "DELETE FROM attendance_records WHERE date < ?";
          break;
        case 'routines':
          query = "DELETE FROM routine_records WHERE date < ?";
          break;
        case 'finance':
          query = "DELETE FROM finance WHERE created_at < ?";
          break;
        case 'announcements':
          query = "DELETE FROM announcements WHERE created_at < ?";
          break;
        case 'suggestions':
          query = "DELETE FROM suggestions WHERE created_at < ?";
          break;
        case 'reports':
          query = "DELETE FROM reports WHERE created_at < ?";
          break;
        case 'memos':
          query = "DELETE FROM memos WHERE created_at < ?";
          break;
        default:
          continue;
      }

      try {
        const result = db.prepare(query).run(...params);
        const deleted = result.changes || 0;
        deletedCounts[category] = deleted;
        totalDeleted += deleted;
      } catch (error) {
        console.error(\`Delete error for \${category}:\`, error);
        deletedCounts[category] = 0;
      }
    }

    // \\u8a18\\u9304\\u64cd\\u4f5c\\u65e5\\u8a8c
    db.logAction(
      currentUser.id,
      currentUser.name,
      'DATA_CLEANUP',
      \`\\u522a\\u9664 \${months} \\u500b\\u6708\\u524d\\u7684\\u8cc7\\u6599\\uff0c\\u5171 \${totalDeleted} \\u7b46\`,
      'WARNING'
    );

    res.json({ 
      success: true, 
      totalDeleted,
      deletedCounts,
      message: \`\\u6210\\u529f\\u522a\\u9664 \${totalDeleted} \\u7b46\\u8cc7\\u6599\`
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: '\\u522a\\u9664\\u5931\\u6557' });
  }
});

module.exports = { dataCleanupRoutes: router };
`;

// 寫入文件
const targetPath = '/app/dist/routes/data-cleanup.js';
fs.writeFileSync(targetPath, routeContent, 'utf8');
console.log('SUCCESS: Created data-cleanup.js route');
