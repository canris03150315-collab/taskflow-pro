const fs = require('fs');

console.log('=== Add Data Cleanup Route (Safe) ===');

// Step 1: Create the route file
const routeCode = `const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

const tableMapping = {
  'tasks': { table: 'tasks', dateField: 'created_at' },
  'leave_requests': { table: 'leave_requests', dateField: 'created_at' },
  'schedules': { table: 'schedules', dateField: 'date' },
  'attendance': { table: 'attendance_records', dateField: 'date' },
  'routines': { table: 'routine_records', dateField: 'date' },
  'finance': { table: 'finance', dateField: 'date' },
  'announcements': { table: 'announcements', dateField: 'created_at' },
  'suggestions': { table: 'suggestions', dateField: 'created_at' },
  'reports': { table: 'reports', dateField: 'created_at' },
  'memos': { table: 'memos', dateField: 'created_at' },
  'kol_profiles': { table: 'kol_profiles', dateField: 'created_at' },
  'kol_contracts': { table: 'kol_contracts', dateField: 'created_at' },
  'kol_payments': { table: 'kol_payments', dateField: 'created_at' }
};

router.post('/preview', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    if (currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: 'Only BOSS can use cleanup tools' });
    }
    const { months, categories } = req.body;
    if (!months || !categories || !Array.isArray(categories)) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    const counts = {};
    for (const categoryId of categories) {
      const mapping = tableMapping[categoryId];
      if (!mapping) continue;
      try {
        const result = db.prepare('SELECT COUNT(*) as count FROM ' + mapping.table + ' WHERE ' + mapping.dateField + ' < ?').get(cutoffStr);
        counts[categoryId] = result ? result.count : 0;
      } catch (err) {
        counts[categoryId] = 0;
      }
    }
    res.json({ counts });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'Preview failed' });
  }
});

router.post('/delete', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    if (currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: 'Only BOSS can use cleanup tools' });
    }
    const { months, categories } = req.body;
    if (!months || !categories || !Array.isArray(categories)) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    let totalDeleted = 0;
    const kolOrder = ['kol_payments', 'kol_contracts', 'kol_profiles'];
    const otherCats = categories.filter(c => !kolOrder.includes(c));
    const kolCats = categories.filter(c => kolOrder.includes(c));
    for (const categoryId of kolOrder) {
      if (!kolCats.includes(categoryId)) continue;
      const mapping = tableMapping[categoryId];
      if (!mapping) continue;
      try {
        const result = db.prepare('DELETE FROM ' + mapping.table + ' WHERE ' + mapping.dateField + ' < ?').run(cutoffStr);
        totalDeleted += result.changes || 0;
      } catch (err) {}
    }
    for (const categoryId of otherCats) {
      const mapping = tableMapping[categoryId];
      if (!mapping) continue;
      try {
        const result = db.prepare('DELETE FROM ' + mapping.table + ' WHERE ' + mapping.dateField + ' < ?').run(cutoffStr);
        totalDeleted += result.changes || 0;
      } catch (err) {}
    }
    res.json({ success: true, totalDeleted });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
`;

fs.writeFileSync('/app/dist/routes/data-cleanup.js', routeCode, 'utf8');
console.log('Created data-cleanup.js');

// Step 2: Check server.js and add route registration safely
const serverPath = '/app/dist/server.js';
let serverContent = fs.readFileSync(serverPath, 'utf8');

if (serverContent.includes("'/api/data-cleanup'")) {
  console.log('Route already registered');
} else {
  // Find this.app.use pattern and add before the last one
  const pattern = /this\.app\.use\('\/api\/kol'/;
  if (serverContent.match(pattern)) {
    serverContent = serverContent.replace(
      pattern,
      "this.app.use('/api/data-cleanup', require('./routes/data-cleanup'));\n        this.app.use('/api/kol'"
    );
    fs.writeFileSync(serverPath, serverContent, 'utf8');
    console.log('Route registered successfully');
  } else {
    console.log('WARNING: Could not find kol route pattern');
    // Try backup route
    const backupPattern = /this\.app\.use\('\/api\/backup'/;
    if (serverContent.match(backupPattern)) {
      serverContent = serverContent.replace(
        backupPattern,
        "this.app.use('/api/data-cleanup', require('./routes/data-cleanup'));\n        this.app.use('/api/backup'"
      );
      fs.writeFileSync(serverPath, serverContent, 'utf8');
      console.log('Route registered (backup pattern)');
    } else {
      console.log('ERROR: Could not register route');
    }
  }
}

console.log('=== Done ===');
