const fs = require('fs');

const filePath = '/app/dist/routes/departments.js';
const content = fs.readFileSync(filePath, 'utf8');

console.log('=== Checking DELETE route ===\n');

// Find DELETE route
const deleteRouteMatch = content.match(/router\.delete\(['"]\/.*?['"],[\s\S]*?(?=router\.|exports\.|$)/);

if (deleteRouteMatch) {
  console.log('Found DELETE route:');
  console.log(deleteRouteMatch[0].substring(0, 500));
  console.log('...\n');
  
  // Check if it uses dbCall
  if (deleteRouteMatch[0].includes('dbCall')) {
    console.log('✓ Uses dbCall');
  } else if (deleteRouteMatch[0].includes('db.run')) {
    console.log('✗ Uses old db.run (should use dbCall)');
  }
  
  // Check if it has CASCADE logic
  if (deleteRouteMatch[0].includes('CASCADE') || deleteRouteMatch[0].includes('DELETE FROM')) {
    console.log('✓ Has cascade delete logic');
  } else {
    console.log('✗ No cascade delete logic');
  }
} else {
  console.log('✗ DELETE route not found');
}
