const fs = require('fs');

console.log('Fixing leaves API permissions...\n');

try {
  const filePath = '/app/dist/routes/leaves.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Fix approve permission check
  const oldApproveCheck = `    // Check permission
    if (currentUser.role !== 'SUPERVISOR' && currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: 'Permission denied' });
    }`;
  
  const newApproveCheck = `    // Check permission - BOSS, SUPERVISOR, MANAGER, or users with APPROVE_LEAVES permission
    const canApprove = 
      currentUser.role === 'BOSS' || 
      currentUser.role === 'MANAGER' ||
      currentUser.role === 'SUPERVISOR' ||
      (currentUser.permissions && currentUser.permissions.includes('APPROVE_LEAVES'));
    
    if (!canApprove) {
      return res.status(403).json({ error: 'Permission denied' });
    }`;
  
  if (content.includes('APPROVE_LEAVES')) {
    console.log('Approve permission check already updated');
  } else {
    content = content.replace(oldApproveCheck, newApproveCheck);
    console.log('Updated approve permission check');
  }
  
  // 2. Fix reject permission check (same logic)
  const oldRejectCheck = `    // Check permission
    if (currentUser.role !== 'SUPERVISOR' && currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: 'Permission denied' });
    }`;
  
  const newRejectCheck = `    // Check permission - BOSS, SUPERVISOR, MANAGER, or users with APPROVE_LEAVES permission
    const canApprove = 
      currentUser.role === 'BOSS' || 
      currentUser.role === 'MANAGER' ||
      currentUser.role === 'SUPERVISOR' ||
      (currentUser.permissions && currentUser.permissions.includes('APPROVE_LEAVES'));
    
    if (!canApprove) {
      return res.status(403).json({ error: 'Permission denied' });
    }`;
  
  // Find and replace the second occurrence (reject route)
  const parts = content.split(oldRejectCheck);
  if (parts.length > 2) {
    content = parts[0] + newApproveCheck + parts[1] + newRejectCheck + parts.slice(2).join(oldRejectCheck);
    console.log('Updated reject permission check');
  }
  
  // 3. Fix rules update permission check
  const oldRulesCheck = `    // Check permission
    if (currentUser.role !== 'SUPERVISOR' && currentUser.role !== 'BOSS') {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // Supervisor can only update their own department
    if (currentUser.role === 'SUPERVISOR' && currentUser.department_id !== departmentId) {
      return res.status(403).json({ error: 'Permission denied' });
    }`;
  
  const newRulesCheck = `    // Check permission - BOSS, MANAGER, SUPERVISOR, or users with MANAGE_LEAVE_RULES permission
    const canManageRules = 
      currentUser.role === 'BOSS' || 
      currentUser.role === 'MANAGER' ||
      (currentUser.role === 'SUPERVISOR' && currentUser.department_id === departmentId) ||
      (currentUser.permissions && currentUser.permissions.includes('MANAGE_LEAVE_RULES') && currentUser.department_id === departmentId);
    
    if (!canManageRules) {
      return res.status(403).json({ error: 'Permission denied' });
    }`;
  
  if (content.includes('MANAGE_LEAVE_RULES')) {
    console.log('Rules permission check already updated');
  } else {
    content = content.replace(oldRulesCheck, newRulesCheck);
    console.log('Updated rules permission check');
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('\nLeaves API permissions fixed successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
