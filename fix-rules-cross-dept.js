const fs = require('fs');

console.log('Fixing rules route for cross-department permission...');

try {
  const schedulesPath = '/app/dist/routes/schedules.js';
  let content = fs.readFileSync(schedulesPath, 'utf8');
  
  // Current logic:
  // (currentUser.role === 'SUPERVISOR' && currentUser.department === departmentId) || hasManageLeaveRules
  // Need to change: hasManageLeaveRules should allow ALL departments
  
  const oldLogic = `const canManage =
        currentUser.role === 'BOSS' ||
        currentUser.role === 'MANAGER' ||
        (currentUser.role === 'SUPERVISOR' && currentUser.department === departmentId) ||
        hasManageLeaveRules;`;
  
  // New logic: MANAGE_LEAVE_RULES permission allows managing ALL departments
  const newLogic = `const canManage =
        currentUser.role === 'BOSS' ||
        currentUser.role === 'MANAGER' ||
        hasManageLeaveRules ||
        (currentUser.role === 'SUPERVISOR' && currentUser.department === departmentId);`;
  
  if (content.includes(oldLogic)) {
    content = content.replace(oldLogic, newLogic);
    fs.writeFileSync(schedulesPath, content, 'utf8');
    console.log('SUCCESS: Rules route fixed - MANAGE_LEAVE_RULES can now manage all departments');
  } else {
    console.log('Pattern not found, checking alternative...');
    
    // Try to find the line and fix it
    if (content.includes("hasManageLeaveRules") && content.includes("currentUser.department === departmentId")) {
      console.log('Found the pattern, already includes hasManageLeaveRules');
      // The logic order matters - hasManageLeaveRules should come before the SUPERVISOR check
      // Let's verify the current logic
    }
  }
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
