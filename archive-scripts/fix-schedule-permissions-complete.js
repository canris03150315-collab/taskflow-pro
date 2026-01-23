const fs = require('fs');

console.log('=== Fix Schedule Permissions Complete ===');

try {
  const schedulesPath = '/app/dist/routes/schedules.js';
  let content = fs.readFileSync(schedulesPath, 'utf8');
  
  // 1. Fix approve route - add hasPermission check
  console.log('\n1. Fixing approve route...');
  const oldApprove = `const canApprove =
        currentUser.role === 'BOSS' ||
        currentUser.role === 'MANAGER' ||
        currentUser.role === 'SUPERVISOR';

      if (!canApprove) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const schedule = await db.get('SELECT * FROM schedules WHERE id = ?', [id]);`;
  
  const newApprove = `// Check permission including APPROVE_LEAVES
      const userPerms = currentUser.permissions ? (typeof currentUser.permissions === 'string' ? JSON.parse(currentUser.permissions) : currentUser.permissions) : [];
      const hasApproveLeaves = userPerms.includes('APPROVE_LEAVES');
      
      const canApprove =
        currentUser.role === 'BOSS' ||
        currentUser.role === 'MANAGER' ||
        currentUser.role === 'SUPERVISOR' ||
        hasApproveLeaves;

      if (!canApprove) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const schedule = await db.get('SELECT * FROM schedules WHERE id = ?', [id]);`;
  
  if (content.includes(oldApprove)) {
    content = content.replace(oldApprove, newApprove);
    console.log('  SUCCESS: approve route fixed');
  } else {
    console.log('  Pattern not found for approve route');
  }
  
  // 2. Fix reject route - add hasPermission check
  console.log('\n2. Fixing reject route...');
  const oldReject = `const canReject =
        currentUser.role === 'BOSS' ||
        currentUser.role === 'MANAGER' ||
        currentUser.role === 'SUPERVISOR';

      if (!canReject) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const schedule = await db.get('SELECT * FROM schedules WHERE id = ?', [id]);
      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      const now = new Date().toISOString();

      await db.run(
        \`UPDATE schedules SET`;
  
  const newReject = `// Check permission including APPROVE_LEAVES
      const userPermsReject = currentUser.permissions ? (typeof currentUser.permissions === 'string' ? JSON.parse(currentUser.permissions) : currentUser.permissions) : [];
      const hasAproveLeavesReject = userPermsReject.includes('APPROVE_LEAVES');
      
      const canReject =
        currentUser.role === 'BOSS' ||
        currentUser.role === 'MANAGER' ||
        currentUser.role === 'SUPERVISOR' ||
        hasAproveLeavesReject;

      if (!canReject) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const schedule = await db.get('SELECT * FROM schedules WHERE id = ?', [id]);
      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      const now = new Date().toISOString();

      await db.run(
        \`UPDATE schedules SET`;
  
  if (content.includes(oldReject)) {
    content = content.replace(oldReject, newReject);
    console.log('  SUCCESS: reject route fixed');
  } else {
    console.log('  Pattern not found for reject route');
  }
  
  // 3. Fix update route - add hasPermission check
  console.log('\n3. Fixing update route...');
  const oldUpdate = `const canManage = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER' || currentUser.role === 'SUPERVISOR';
      if (!canManage) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const schedule = await db.get('SELECT * FROM schedules WHERE id = ?', [id]);`;
  
  const newUpdate = `// Check permission including APPROVE_LEAVES
      const userPermsUpdate = currentUser.permissions ? (typeof currentUser.permissions === 'string' ? JSON.parse(currentUser.permissions) : currentUser.permissions) : [];
      const hasApproveLeavesUpdate = userPermsUpdate.includes('APPROVE_LEAVES');
      
      const canManage = currentUser.role === 'BOSS' || currentUser.role === 'MANAGER' || currentUser.role === 'SUPERVISOR' || hasApproveLeavesUpdate;
      if (!canManage) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const schedule = await db.get('SELECT * FROM schedules WHERE id = ?', [id]);`;
  
  if (content.includes(oldUpdate)) {
    content = content.replace(oldUpdate, newUpdate);
    console.log('  SUCCESS: update route fixed');
  } else {
    console.log('  Pattern not found for update route');
  }
  
  // 4. Fix rules route - add MANAGE_LEAVE_RULES check
  console.log('\n4. Fixing rules route...');
  const oldRules = `const canManage =
        currentUser.role === 'BOSS' ||
        currentUser.role === 'MANAGER' ||
        (currentUser.role === 'SUPERVISOR' && currentUser.department === departmentId);

      if (!canManage) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const now = new Date().toISOString();

      let rules = await db.get(`;
  
  const newRules = `// Check permission including MANAGE_LEAVE_RULES
      const userPermsRules = currentUser.permissions ? (typeof currentUser.permissions === 'string' ? JSON.parse(currentUser.permissions) : currentUser.permissions) : [];
      const hasManageLeaveRules = userPermsRules.includes('MANAGE_LEAVE_RULES');
      
      const canManage =
        currentUser.role === 'BOSS' ||
        currentUser.role === 'MANAGER' ||
        (currentUser.role === 'SUPERVISOR' && currentUser.department === departmentId) ||
        hasManageLeaveRules;

      if (!canManage) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      const now = new Date().toISOString();

      let rules = await db.get(`;
  
  if (content.includes(oldRules)) {
    content = content.replace(oldRules, newRules);
    console.log('  SUCCESS: rules route fixed');
  } else {
    console.log('  Pattern not found for rules route');
  }
  
  // Save the file
  fs.writeFileSync(schedulesPath, content, 'utf8');
  console.log('\n=== All fixes applied ===');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
