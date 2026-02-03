const fs = require('fs');

const schedulesPath = '/app/dist/routes/schedules.js';
let content = fs.readFileSync(schedulesPath, 'utf8');

console.log('Fixing DELETE route position...');

// Find and remove the incorrectly placed DELETE route (after return router)
const deleteRoutePattern = /\/\/ DELETE [\s\S]*?router\.delete\('\/:id'[\s\S]*?\}\);/;
const match = content.match(deleteRoutePattern);

if (match) {
  console.log('Found DELETE route, removing from incorrect position...');
  content = content.replace(deleteRoutePattern, '');
}

// Find the position before "return router;"
const returnIndex = content.indexOf('  return router;');

if (returnIndex === -1) {
  console.log('ERROR: Cannot find "return router;"');
  process.exit(1);
}

// Insert DELETE route before "return router;"
const deleteRoute = `
  // DELETE /:id - \u8edf\u522a\u9664\u6392\u73ed
  router.delete('/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = req.user;
      
      // 1. \u67e5\u8a62\u6392\u73ed\u8a18\u9304
      const schedule = await db.get('SELECT * FROM schedules WHERE id = ?', [id]);
      
      if (!schedule) {
        return res.status(404).json({ error: '\u6392\u73ed\u4e0d\u5b58\u5728' });
      }
      
      // 2. \u6b0a\u9650\u6aa2\u67e5
      const canDelete = 
        schedule.user_id === currentUser.id || 
        currentUser.role === 'BOSS' || 
        (currentUser.role === 'SUPERVISOR' && schedule.department_id === currentUser.department) ||
        (currentUser.role === 'MANAGER' && schedule.department_id === currentUser.department);
      
      if (!canDelete) {
        return res.status(403).json({ error: '\u7121\u6b0a\u522a\u9664\u6b64\u6392\u73ed' });
      }
      
      // 3. \u72c0\u614b\u6aa2\u67e5
      if (schedule.status !== 'APPROVED') {
        return res.status(400).json({ error: '\u53ea\u80fd\u522a\u9664\u5df2\u6279\u51c6\u7684\u6392\u73ed' });
      }
      
      // 4. \u6642\u9593\u6aa2\u67e5
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const scheduleMonth = new Date(schedule.year, schedule.month - 1, 1);
      
      if (scheduleMonth < currentMonth) {
        return res.status(400).json({ error: '\u7121\u6cd5\u522a\u9664\u904e\u53bb\u7684\u6392\u73ed' });
      }
      
      // 5. \u8edf\u522a\u9664
      const now_iso = new Date().toISOString();
      await db.run('UPDATE schedules SET status = ?, updated_at = ? WHERE id = ?', ['CANCELLED', now_iso, id]);
      
      // 6. \u8a18\u9304\u65e5\u8a8c
      if (db.logAction) {
        db.logAction(currentUser.id, currentUser.name, 'DELETE_SCHEDULE', 
          \`\u522a\u9664\u6392\u73ed: \${schedule.year}\u5e74\${schedule.month}\u6708\`, 'INFO');
      }
      
      console.log(\`Schedule deleted: \${id} by \${currentUser.name}\`);
      res.json({ success: true, message: '\u6392\u73ed\u5df2\u522a\u9664' });
    } catch (error) {
      console.error('Delete schedule error:', error);
      res.status(500).json({ error: error.message || '\u522a\u9664\u5931\u6557' });
    }
  });

`;

// Insert before "return router;"
content = content.slice(0, returnIndex) + deleteRoute + content.slice(returnIndex);

// Write back
fs.writeFileSync(schedulesPath, content, 'utf8');

console.log('SUCCESS: DELETE route added in correct position (before return router)');
