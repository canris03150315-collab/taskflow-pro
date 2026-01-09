const fs = require('fs');

console.log('Fixing schedule update API correctly...\n');

try {
  const filePath = '/app/dist/routes/schedules.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix the status query - use escaped single quotes
  content = content.replace(
    /WHERE department_id = \? AND year = \? AND month = \? AND id != \? AND status = "APPROVED"/g,
    "WHERE department_id = ? AND year = ? AND month = ? AND id != ? AND status = \\'APPROVED\\'"
  );
  
  fs.writeFileSync(filePath, 'utf8');
  
  console.log('OK Schedule update API fixed correctly');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
