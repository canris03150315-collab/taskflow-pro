const fs = require('fs');

console.log('=== Fix Schedule Permissions v2 ===');

try {
  const schedulesPath = '/app/dist/routes/schedules.js';
  let content = fs.readFileSync(schedulesPath, 'utf8');
  const lines = content.split('\n');
  let newLines = [];
  let i = 0;
  let fixedApprove = false;
  let fixedReject = false;
  let fixedRules = false;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Fix approve route
    if (line.includes("const canApprove =") && !fixedApprove && i > 70) {
      // Check if next lines are the role checks
      if (lines[i+1] && lines[i+1].includes("currentUser.role === 'BOSS'")) {
        // Add permission check before canApprove
        newLines.push("      // Check permission including APPROVE_LEAVES");
        newLines.push("      const userPermsApprove = currentUser.permissions ? (typeof currentUser.permissions === 'string' ? JSON.parse(currentUser.permissions) : currentUser.permissions) : [];");
        newLines.push("      const hasApproveLeaves = userPermsApprove.includes('APPROVE_LEAVES');");
        newLines.push("      ");
        newLines.push("      const canApprove =");
        newLines.push("        currentUser.role === 'BOSS' ||");
        newLines.push("        currentUser.role === 'MANAGER' ||");
        newLines.push("        currentUser.role === 'SUPERVISOR' ||");
        newLines.push("        hasApproveLeaves;");
        
        // Skip original 4 lines
        i += 4;
        fixedApprove = true;
        console.log('Fixed approve route at line', i);
        continue;
      }
    }
    
    // Fix reject route
    if (line.includes("const canReject =") && !fixedReject) {
      if (lines[i+1] && lines[i+1].includes("currentUser.role === 'BOSS'")) {
        newLines.push("      // Check permission including APPROVE_LEAVES");
        newLines.push("      const userPermsReject = currentUser.permissions ? (typeof currentUser.permissions === 'string' ? JSON.parse(currentUser.permissions) : currentUser.permissions) : [];");
        newLines.push("      const hasApproveLeavesReject = userPermsReject.includes('APPROVE_LEAVES');");
        newLines.push("      ");
        newLines.push("      const canReject =");
        newLines.push("        currentUser.role === 'BOSS' ||");
        newLines.push("        currentUser.role === 'MANAGER' ||");
        newLines.push("        currentUser.role === 'SUPERVISOR' ||");
        newLines.push("        hasApproveLeavesReject;");
        
        i += 4;
        fixedReject = true;
        console.log('Fixed reject route at line', i);
        continue;
      }
    }
    
    // Fix rules route - look for canManage with SUPERVISOR department check
    if (line.includes("const canManage =") && !fixedRules && lines[i+3] && lines[i+3].includes("SUPERVISOR") && lines[i+3].includes("department")) {
      newLines.push("      // Check permission including MANAGE_LEAVE_RULES");
      newLines.push("      const userPermsRules = currentUser.permissions ? (typeof currentUser.permissions === 'string' ? JSON.parse(currentUser.permissions) : currentUser.permissions) : [];");
      newLines.push("      const hasManageLeaveRules = userPermsRules.includes('MANAGE_LEAVE_RULES');");
      newLines.push("      ");
      newLines.push("      const canManage =");
      newLines.push("        currentUser.role === 'BOSS' ||");
      newLines.push("        currentUser.role === 'MANAGER' ||");
      newLines.push("        (currentUser.role === 'SUPERVISOR' && currentUser.department === departmentId) ||");
      newLines.push("        hasManageLeaveRules;");
      
      i += 4;
      fixedRules = true;
      console.log('Fixed rules route at line', i);
      continue;
    }
    
    newLines.push(line);
    i++;
  }
  
  fs.writeFileSync(schedulesPath, newLines.join('\n'), 'utf8');
  
  console.log('\nSummary:');
  console.log('  Approve route:', fixedApprove ? 'FIXED' : 'Already fixed or not found');
  console.log('  Reject route:', fixedReject ? 'FIXED' : 'Already fixed or not found');
  console.log('  Rules route:', fixedRules ? 'FIXED' : 'Already fixed or not found');
  console.log('\n=== Done ===');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
