const fs = require('fs');

const schedulesPath = '/app/dist/routes/schedules.js';
let content = fs.readFileSync(schedulesPath, 'utf8');

console.log('Removing employee self-delete permission...');

// Find and replace the permission check
// Old: allows employee to delete their own schedules
const oldPermissionCheck = `      const canDelete =
        schedule.user_id === currentUser.id ||
        currentUser.role === 'BOSS' ||
        (currentUser.role === 'SUPERVISOR' && schedule.department_id === currentUser.department) ||
        (currentUser.role === 'MANAGER' && schedule.department_id === currentUser.department);`;

// New: only BOSS/SUPERVISOR/MANAGER can delete
const newPermissionCheck = `      const canDelete =
        currentUser.role === 'BOSS' ||
        (currentUser.role === 'SUPERVISOR' && schedule.department_id === currentUser.department) ||
        (currentUser.role === 'MANAGER' && schedule.department_id === currentUser.department);`;

if (content.includes('schedule.user_id === currentUser.id ||')) {
  content = content.replace(oldPermissionCheck, newPermissionCheck);
  console.log('SUCCESS: Employee self-delete permission removed');
} else {
  console.log('WARNING: Pattern not found, permission may already be removed');
}

// Write back
fs.writeFileSync(schedulesPath, content, 'utf8');
console.log('File updated successfully');
