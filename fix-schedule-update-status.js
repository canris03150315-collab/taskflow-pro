const fs = require('fs');

console.log('Fixing schedule update API status query...\n');

try {
  const filePath = '/app/dist/routes/schedules.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix the status query - use 'APPROVED' as a string value, not a column name
  content = content.replace(
    /WHERE department_id = \? AND year = \? AND month = \? AND id != \? AND status = "APPROVED"/g,
    "WHERE department_id = ? AND year = ? AND month = ? AND id != ? AND status = 'APPROVED'"
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('OK Schedule update API status query fixed');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
