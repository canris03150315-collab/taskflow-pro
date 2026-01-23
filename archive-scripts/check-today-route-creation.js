const fs = require('fs');

console.log('=== Check /today route record creation logic ===');

const content = fs.readFileSync('/app/dist/routes/routines.js', 'utf8');

// Find the /today route
const todayMatch = content.match(/router\.get\('\/today'[\s\S]*?(?=router\.|module\.exports)/);

if (todayMatch) {
  const route = todayMatch[0];
  
  // Find the record creation part
  const createMatch = route.match(/const items = JSON\.parse\(template\.items[\s\S]*?JSON\.stringify\(items\)/);
  
  if (createMatch) {
    console.log('Found record creation logic:');
    console.log(createMatch[0]);
  } else {
    console.log('Could not find record creation logic');
  }
} else {
  console.log('Could not find /today route');
}

console.log('\n=== Check complete ===');
