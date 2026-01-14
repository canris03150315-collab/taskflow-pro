const fs = require('fs');

console.log('Fixing schedules permission for EMPLOYEE (v2)...');

try {
  const schedulesPath = '/app/dist/routes/schedules.js';
  let content = fs.readFileSync(schedulesPath, 'utf8');
  
  // Match the exact pattern with flexible whitespace
  const oldPattern = /else \{\s*schedules = await db\.all\(\s*'SELECT \* FROM schedules WHERE user_id = \? ORDER BY year DESC, month DESC, submitted_at DESC',\s*\[currentUser\.id\]\s*\);/;
  
  const newCode = `else {
        // EMPLOYEE can see their own + all APPROVED in department
        schedules = await db.all(
          "SELECT * FROM schedules WHERE user_id = ? OR (department_id = ? AND status = 'APPROVED') ORDER BY year DESC, month DESC, submitted_at DESC",
          [currentUser.id, currentUser.department]
        );`;
  
  if (oldPattern.test(content)) {
    content = content.replace(oldPattern, newCode);
    fs.writeFileSync(schedulesPath, content, 'utf8');
    console.log('SUCCESS: Schedules permission fixed');
  } else {
    console.log('Pattern not found, trying alternative...');
    
    // Try simpler replacement
    const simpleOld = "WHERE user_id = ? ORDER BY year DESC, month DESC, submitted_at DESC',";
    const simpleNew = "WHERE user_id = ? OR (department_id = ? AND status = 'APPROVED') ORDER BY year DESC, month DESC, submitted_at DESC\",";
    
    if (content.includes(simpleOld)) {
      content = content.replace(simpleOld, simpleNew);
      
      // Also need to update the parameters
      content = content.replace(
        "[currentUser.id]\n        );",
        "[currentUser.id, currentUser.department]\n        );"
      );
      
      fs.writeFileSync(schedulesPath, content, 'utf8');
      console.log('SUCCESS: Fixed with simple replacement');
    } else {
      console.log('Cannot find pattern to replace');
    }
  }
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
