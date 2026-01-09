const fs = require('fs');

const filePath = '/app/dist/routes/attendance.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Adding DELETE /api/attendance/:id route...');

// Check if route already exists
if (content.includes("router.delete('/:id'")) {
  console.log('Route already exists, skipping...');
  process.exit(0);
}

// Find where to insert (before exports)
const exportsMatch = content.match(/exports\.attendanceRoutes\s*=\s*router/);
if (!exportsMatch) {
  console.log('ERROR: Could not find exports statement');
  process.exit(1);
}

const insertPos = content.indexOf(exportsMatch[0]);

// The new DELETE route with Unicode escape for Chinese
const newRoute = `
// DELETE /:id - Delete attendance record
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const currentUser = req.user;
    const { id } = req.params;
    
    // Permission check - only BOSS, MANAGER, SUPERVISOR can delete
    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER' && currentUser.role !== 'SUPERVISOR') {
      return res.status(403).json({ error: '\\u6b0a\\u9650\\u4e0d\\u8db3' });
    }
    
    // Get existing record
    const existing = await dbCall(db, 'get', 'SELECT * FROM attendance_records WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: '\\u8a18\\u9304\\u4e0d\\u5b58\\u5728' });
    }
    
    // SUPERVISOR can only delete records for their department
    if (currentUser.role === 'SUPERVISOR') {
      const targetUser = await dbCall(db, 'get', 'SELECT * FROM users WHERE id = ?', [existing.user_id]);
      if (targetUser && targetUser.department !== currentUser.department) {
        return res.status(403).json({ error: '\\u53ea\\u80fd\\u522a\\u9664\\u540c\\u90e8\\u9580\\u7684\\u8a18\\u9304' });
      }
    }
    
    // Delete record
    await dbCall(db, 'run', 'DELETE FROM attendance_records WHERE id = ?', [id]);
    
    console.log('[Attendance] Deleted record:', id, 'by:', currentUser.name);
    
    res.json({
      success: true,
      message: '\\u6253\\u5361\\u8a18\\u9304\\u5df2\\u522a\\u9664'
    });
    
  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({ error: '\\u4f3a\\u670d\\u5668\\u5167\\u90e8\\u932f\\u8aa4' });
  }
});

`;

// Insert before exports
content = content.substring(0, insertPos) + newRoute + content.substring(insertPos);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Added DELETE /:id route');
