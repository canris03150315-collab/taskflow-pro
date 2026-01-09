const fs = require('fs');

console.log('Fixing schedule update API SQL query...\n');

try {
  const filePath = '/app/dist/routes/schedules.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find and replace the problematic query
  // Use template literals to avoid quote escaping issues
  const oldQuery = 'WHERE department_id = ? AND year = ? AND month = ? AND id != ? AND status = "APPROVED"';
  const newQuery = "WHERE department_id = ? AND year = ? AND month = ? AND id != ? AND status = 'APPROVED'";
  
  // Count occurrences before replacement
  const beforeCount = (content.match(new RegExp(oldQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  console.log(`Found ${beforeCount} occurrences of the old query`);
  
  if (beforeCount === 0) {
    console.log('INFO: Query already fixed or not found');
    process.exit(0);
  }
  
  // Replace all occurrences
  content = content.split(oldQuery).join(newQuery);
  
  // Verify replacement
  const afterCount = (content.match(new RegExp(newQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  console.log(`After replacement: ${afterCount} occurrences of the new query`);
  
  // Write back
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('OK Schedule update API SQL query fixed');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
