const fs = require('fs');

console.log('Fixing schedules permission for EMPLOYEE...');

try {
  const schedulesPath = '/app/dist/routes/schedules.js';
  let content = fs.readFileSync(schedulesPath, 'utf8');
  
  // Find and replace the permission logic for GET /
  // Old logic: EMPLOYEE can only see their own schedules
  // New logic: EMPLOYEE can see all APPROVED schedules in their department (for calendar view)
  
  const oldCode = `} else {
        schedules = await db.all(
          'SELECT * FROM schedules WHERE user_id = ? ORDER BY year DESC, month DESC, submitted_at DESC',
          [currentUser.id]
        );
      }`;
  
  const newCode = `} else {
        // EMPLOYEE can see:
        // 1. All their own schedules (any status)
        // 2. All APPROVED schedules in their department (for calendar view)
        schedules = await db.all(
          \`SELECT * FROM schedules 
           WHERE (user_id = ? OR (department_id = ? AND status = 'APPROVED'))
           ORDER BY year DESC, month DESC, submitted_at DESC\`,
          [currentUser.id, currentUser.department]
        );
      }`;
  
  if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(schedulesPath, content, 'utf8');
    console.log('SUCCESS: Schedules permission fixed');
    console.log('EMPLOYEE can now see approved schedules in their department');
  } else {
    console.log('Old code pattern not found. Checking current state...');
    
    // Check if already fixed
    if (content.includes("department_id = ? AND status = 'APPROVED'")) {
      console.log('Already fixed!');
    } else {
      console.log('Manual fix needed. Current GET / handler:');
      const match = content.match(/router\.get\('\/'.+?}\);/s);
      if (match) {
        console.log(match[0].substring(0, 500));
      }
    }
  }
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
