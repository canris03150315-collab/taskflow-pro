const fs = require('fs');

const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing user DELETE route to handle foreign key constraints...');

// Find the DELETE route and add cascade deletion logic
const deleteRoutePattern = /router\.delete\('\/(\w+)', authenticateToken, async \(req, res\) => \{[\s\S]*?const userId = req\.params\.\w+;[\s\S]*?await db\.run\('DELETE FROM users WHERE id = \?', \[userId\]\);/;

const newDeleteRoute = `router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    const userId = req.params.id;

    if (currentUser.role !== 'BOSS' && currentUser.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    if (userId === currentUser.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    // Delete related data first to avoid foreign key constraint
    await db.run('DELETE FROM tasks WHERE created_by = ? OR assigned_to = ? OR accepted_by_user_id = ?', [userId, userId, userId]);
    await db.run('DELETE FROM leave_requests WHERE user_id = ? OR approver_id = ?', [userId, userId]);
    await db.run('DELETE FROM schedules WHERE user_id = ? OR reviewed_by = ?', [userId, userId]);
    await db.run('DELETE FROM routine_records WHERE user_id = ?', [userId]);
    await db.run('DELETE FROM attendance WHERE user_id = ?', [userId]);
    await db.run('DELETE FROM reports WHERE user_id = ?', [userId]);
    await db.run('DELETE FROM finance WHERE user_id = ?', [userId]);
    await db.run('DELETE FROM announcements WHERE created_by = ?', [userId]);
    await db.run('DELETE FROM suggestions WHERE author_id = ? OR status_changed_by = ?', [userId, userId]);
    
    // Now delete the user
    await db.run('DELETE FROM users WHERE id = ?', [userId]);`;

if (deleteRoutePattern.test(content)) {
  content = content.replace(deleteRoutePattern, newDeleteRoute);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Fixed user DELETE route with cascade deletion');
} else {
  console.log('WARNING: Could not find DELETE route pattern, trying alternative approach...');
  
  // Alternative: Find and replace just the DELETE statement
  const simplePattern = /await db\.run\('DELETE FROM users WHERE id = \?', \[userId\]\);/;
  
  if (simplePattern.test(content)) {
    const cascadeDelete = `// Delete related data first
    await db.run('DELETE FROM tasks WHERE created_by = ? OR assigned_to = ? OR accepted_by_user_id = ?', [userId, userId, userId]);
    await db.run('DELETE FROM leave_requests WHERE user_id = ? OR approver_id = ?', [userId, userId]);
    await db.run('DELETE FROM schedules WHERE user_id = ? OR reviewed_by = ?', [userId, userId]);
    await db.run('DELETE FROM routine_records WHERE user_id = ?', [userId]);
    await db.run('DELETE FROM attendance WHERE user_id = ?', [userId]);
    await db.run('DELETE FROM reports WHERE user_id = ?', [userId]);
    await db.run('DELETE FROM finance WHERE user_id = ?', [userId]);
    await db.run('DELETE FROM announcements WHERE created_by = ?', [userId]);
    await db.run('DELETE FROM suggestions WHERE author_id = ? OR status_changed_by = ?', [userId, userId]);
    
    // Now delete the user
    await db.run('DELETE FROM users WHERE id = ?', [userId]);`;
    
    content = content.replace(simplePattern, cascadeDelete);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Added cascade deletion before user delete');
  } else {
    console.log('ERROR: Could not find user delete statement');
    process.exit(1);
  }
}
