const fs = require('fs');

console.log('=== Fix Cross-Department Permission ===');

// Fix schedules.js - Allow users with APPROVE_LEAVES permission to see all departments
console.log('\n1. Fixing schedules.js...');
try {
  const schedulesPath = '/app/dist/routes/schedules.js';
  let content = fs.readFileSync(schedulesPath, 'utf8');
  
  // Current logic for SUPERVISOR:
  // } else if (currentUser.role === 'SUPERVISOR') {
  //   schedules = await db.all('SELECT * FROM schedules WHERE department_id = ?...'
  
  // Need to add: Check if user has APPROVE_LEAVES permission
  const oldSupervisorCheck = `} else if (currentUser.role === 'SUPERVISOR') {
        schedules = await db.all(
          'SELECT * FROM schedules WHERE department_id = ? ORDER BY year DESC, month DESC, submitted_at DESC',
          [currentUser.department]
        );`;
  
  const newSupervisorCheck = `} else if (currentUser.role === 'SUPERVISOR') {
        // Check if SUPERVISOR has cross-department permission (APPROVE_LEAVES in permissions array)
        const userPerms = currentUser.permissions ? JSON.parse(currentUser.permissions) : [];
        const hasApproveLeaves = userPerms.includes('APPROVE_LEAVES');
        
        if (hasApproveLeaves) {
          // Can see all departments
          schedules = await db.all('SELECT * FROM schedules ORDER BY year DESC, month DESC, submitted_at DESC');
        } else {
          // Only own department
          schedules = await db.all(
            'SELECT * FROM schedules WHERE department_id = ? ORDER BY year DESC, month DESC, submitted_at DESC',
            [currentUser.department]
          );
        }`;
  
  if (content.includes(oldSupervisorCheck)) {
    content = content.replace(oldSupervisorCheck, newSupervisorCheck);
    fs.writeFileSync(schedulesPath, content, 'utf8');
    console.log('SUCCESS: schedules.js fixed');
  } else {
    console.log('Pattern not found in schedules.js, trying alternative...');
    
    // Try simpler pattern match
    if (content.includes("currentUser.role === 'SUPERVISOR'") && content.includes("WHERE department_id = ?")) {
      console.log('Found SUPERVISOR check, need manual fix');
    }
  }
} catch (error) {
  console.error('Error fixing schedules.js:', error.message);
}

// Fix users.js - Allow users with APPROVE_LEAVES permission to see all users
console.log('\n2. Fixing users.js...');
try {
  const usersPath = '/app/dist/routes/users.js';
  let content = fs.readFileSync(usersPath, 'utf8');
  
  // Current logic:
  // if (currentUser.role === 'EMPLOYEE') { query += ' WHERE department = ?'; }
  
  // Need to add: Check for APPROVE_LEAVES permission for SUPERVISOR too
  const oldEmployeeCheck = `// EMPLOYEE can only see users in their own department
        if (currentUser.role === 'EMPLOYEE') {
            query += ' WHERE department = ?';
            params.push(currentUser.department);
        }`;
  
  const newPermissionCheck = `// Check permissions for cross-department access
        const userPerms = currentUser.permissions ? (typeof currentUser.permissions === 'string' ? JSON.parse(currentUser.permissions) : currentUser.permissions) : [];
        const hasApproveLeaves = userPerms.includes('APPROVE_LEAVES');
        
        // EMPLOYEE without special permission: only own department
        // SUPERVISOR without APPROVE_LEAVES: only own department  
        if (currentUser.role === 'EMPLOYEE' || (currentUser.role === 'SUPERVISOR' && !hasApproveLeaves)) {
            query += ' WHERE department = ?';
            params.push(currentUser.department);
        }
        // SUPERVISOR with APPROVE_LEAVES, MANAGER, BOSS: can see all`;
  
  if (content.includes(oldEmployeeCheck)) {
    content = content.replace(oldEmployeeCheck, newPermissionCheck);
    fs.writeFileSync(usersPath, content, 'utf8');
    console.log('SUCCESS: users.js fixed');
  } else {
    console.log('Pattern not found in users.js');
  }
} catch (error) {
  console.error('Error fixing users.js:', error.message);
}

console.log('\n=== Done ===');
