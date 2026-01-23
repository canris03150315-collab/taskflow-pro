const fs = require('fs');

console.log('Fixing schedules.js for cross-department permission v2...');

try {
  const schedulesPath = '/app/dist/routes/schedules.js';
  let content = fs.readFileSync(schedulesPath, 'utf8');
  
  // Simple line replacement - find the SUPERVISOR block and replace
  const lines = content.split('\n');
  let newLines = [];
  let i = 0;
  let fixed = false;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Find the SUPERVISOR check line
    if (line.includes("currentUser.role === 'SUPERVISOR'") && !fixed) {
      // Add the new SUPERVISOR logic
      newLines.push("      } else if (currentUser.role === 'SUPERVISOR') {");
      newLines.push("        // Check if SUPERVISOR has cross-department permission");
      newLines.push("        const userPerms = currentUser.permissions ? (typeof currentUser.permissions === 'string' ? JSON.parse(currentUser.permissions) : currentUser.permissions) : [];");
      newLines.push("        const hasApproveLeaves = userPerms.includes('APPROVE_LEAVES');");
      newLines.push("        ");
      newLines.push("        if (hasApproveLeaves) {");
      newLines.push("          schedules = await db.all('SELECT * FROM schedules ORDER BY year DESC, month DESC, submitted_at DESC');");
      newLines.push("        } else {");
      newLines.push("          schedules = await db.all(");
      newLines.push("            'SELECT * FROM schedules WHERE department_id = ? ORDER BY year DESC, month DESC, submitted_at DESC',");
      newLines.push("            [currentUser.department]");
      newLines.push("          );");
      newLines.push("        }");
      
      // Skip the original SUPERVISOR block (next 4 lines)
      i += 5; // Skip current line + 4 more
      fixed = true;
      continue;
    }
    
    newLines.push(line);
    i++;
  }
  
  if (fixed) {
    fs.writeFileSync(schedulesPath, newLines.join('\n'), 'utf8');
    console.log('SUCCESS: schedules.js fixed');
  } else {
    console.log('SUPERVISOR block not found');
  }
  
} catch (error) {
  console.error('ERROR:', error.message);
}
