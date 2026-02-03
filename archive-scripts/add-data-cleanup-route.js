const fs = require('fs');

console.log('=== Add Data Cleanup Route ===');

const routeCode = `
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Table mapping for cleanup
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

// Preview - count records to be deleted
router.post('/preview', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    
    // Only BOSS can use this
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
        const result = db.prepare(
          'SELECT COUNT(*) as count FROM ' + mapping.table + ' WHERE ' + mapping.dateField + ' < ?'
        ).get(cutoffStr);
        counts[categoryId] = result ? result.count : 0;
      } catch (err) {
        console.error('Error counting ' + categoryId + ':', err.message);
        counts[categoryId] = 0;
      }
    }
    
    res.json({ counts });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'Preview failed' });
  }
});

// Delete - actually delete records
router.post('/delete', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    
    // Only BOSS can use this
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
    
    // Special handling for KOL - delete in order (payments -> contracts -> profiles)
    const kolCategories = ['kol_payments', 'kol_contracts', 'kol_profiles'];
    const otherCategories = categories.filter(c => !kolCategories.includes(c));
    const kolToDelete = categories.filter(c => kolCategories.includes(c));
    
    // Delete KOL in correct order
    for (const categoryId of kolCategories) {
      if (!kolToDelete.includes(categoryId)) continue;
      
      const mapping = tableMapping[categoryId];
      if (!mapping) continue;
      
      try {
        const result = db.prepare(
          'DELETE FROM ' + mapping.table + ' WHERE ' + mapping.dateField + ' < ?'
        ).run(cutoffStr);
        totalDeleted += result.changes || 0;
        console.log('Deleted ' + (result.changes || 0) + ' from ' + mapping.table);
      } catch (err) {
        console.error('Error deleting ' + categoryId + ':', err.message);
      }
    }
    
    // Delete other categories
    for (const categoryId of otherCategories) {
      const mapping = tableMapping[categoryId];
      if (!mapping) continue;
      
      try {
        const result = db.prepare(
          'DELETE FROM ' + mapping.table + ' WHERE ' + mapping.dateField + ' < ?'
        ).run(cutoffStr);
        totalDeleted += result.changes || 0;
        console.log('Deleted ' + (result.changes || 0) + ' from ' + mapping.table);
      } catch (err) {
        console.error('Error deleting ' + categoryId + ':', err.message);
      }
    }
    
    res.json({ success: true, totalDeleted });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
`;

// Write the route file
fs.writeFileSync('/app/dist/routes/data-cleanup.js', routeCode, 'utf8');
console.log('Created data-cleanup.js route');

// Now register the route in server.js
const serverPath = '/app/dist/server.js';
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Check if already registered
if (serverContent.includes('data-cleanup')) {
  console.log('Route already registered');
} else {
  // Find where routes are registered and add our route
  const routePattern = /app\.use\('\/api\/backup'/;
  if (serverContent.match(routePattern)) {
    serverContent = serverContent.replace(
      routePattern,
      "app.use('/api/data-cleanup', require('./routes/data-cleanup'));\n        app.use('/api/backup'"
    );
    fs.writeFileSync(serverPath, serverContent, 'utf8');
    console.log('Registered route in server.js');
  } else {
    // Try alternative pattern
    const altPattern = /app\.use\('\/api\/kol'/;
    if (serverContent.match(altPattern)) {
      serverContent = serverContent.replace(
        altPattern,
        "app.use('/api/data-cleanup', require('./routes/data-cleanup'));\n        app.use('/api/kol'"
      );
      fs.writeFileSync(serverPath, serverContent, 'utf8');
      console.log('Registered route in server.js (alt)');
    } else {
      console.log('WARNING: Could not find place to register route');
    }
  }
}

console.log('=== Done ===');
