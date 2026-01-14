const fs = require('fs');

console.log('Fixing schedules.js for cross-department permission...');

try {
  const schedulesPath = '/app/dist/routes/schedules.js';
  let content = fs.readFileSync(schedulesPath, 'utf8');
  
  // Find and replace the SUPERVISOR section
  const oldCode = `} else if (currentUser.role === 'SUPERVISOR') {
        schedules = await db.all(
          'SELECT * FROM schedules WHERE department_id = ? ORDER BY year DESC, month DESC, submitted_at DESC',
          [currentUser.department]
        );
      }`;
  
  const newCode = `} else if (currentUser.role === 'SUPERVISOR') {
        // Check if SUPERVISOR has cross-department permission
        const userPerms = currentUser.permissions ? (typeof currentUser.permissions === 'string' ? JSON.parse(currentUser.permissions) : currentUser.permissions) : [];
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
        }
      }`;
  
  if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(schedulesPath, content, 'utf8');
    console.log('SUCCESS: schedules.js fixed');
  } else {
    console.log('Exact pattern not found, trying line-by-line...');
    
    // Try to find the key line
    if (content.includes("currentUser.role === 'SUPERVISOR'") && 
        content.includes("WHERE department_id = ?") &&
        !content.includes("hasApproveLeaves")) {
      
      // Use regex to replace
      const regex = /else if \(currentUser\.role === 'SUPERVISOR'\) \{\s*schedules = await db\.all\(\s*'SELECT \* FROM schedules WHERE department_id = \? ORDER BY year DESC, month DESC, submitted_at DESC',\s*\[currentUser\.department\]\s*\);\s*\}/;
      
      if (regex.test(content)) {
        content = content.replace(regex, newCode);
        fs.writeFileSync(schedulesPath, content, 'utf8');
        console.log('SUCCESS: Fixed with regex');
      } else {
        console.log('Regex did not match');
      }
    } else if (content.includes("hasApproveLeaves")) {
      console.log('Already fixed!');
    } else {
      console.log('Cannot find pattern');
    }
  }
} catch (error) {
  console.error('ERROR:', error.message);
}
