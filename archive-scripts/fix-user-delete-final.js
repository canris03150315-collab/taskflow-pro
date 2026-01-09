const fs = require('fs');

const filePath = '/app/dist/routes/users.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Adding cascade deletion for user DELETE route...');

// Find the line: await db.run('DELETE FROM users WHERE id = ?', [id]);
const deletePattern = /await db\.run\('DELETE FROM users WHERE id = \?', \[id\]\);/;

if (deletePattern.test(content)) {
  const cascadeDelete = `// Delete related data first to avoid foreign key constraints
        await db.run('DELETE FROM tasks WHERE created_by = ? OR assigned_to_user_id = ? OR accepted_by_user_id = ?', [id, id, id]);
        await db.run('DELETE FROM leave_requests WHERE user_id = ? OR approver_id = ?', [id, id]);
        await db.run('DELETE FROM schedules WHERE user_id = ? OR reviewed_by = ?', [id, id]);
        await db.run('DELETE FROM routine_records WHERE user_id = ?', [id]);
        await db.run('DELETE FROM attendance_records WHERE user_id = ?', [id]);
        await db.run('DELETE FROM reports WHERE user_id = ?', [id]);
        await db.run('DELETE FROM finance WHERE user_id = ?', [id]);
        await db.run('DELETE FROM announcements WHERE created_by = ?', [id]);
        await db.run('DELETE FROM suggestions WHERE author_id = ? OR status_changed_by = ?', [id, id]);
        
        // Now delete the user
        await db.run('DELETE FROM users WHERE id = ?', [id]);`;
  
  content = content.replace(deletePattern, cascadeDelete);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Added cascade deletion before user delete');
} else {
  console.log('ERROR: Could not find DELETE FROM users statement');
  process.exit(1);
}
