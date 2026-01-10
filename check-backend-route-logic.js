const fs = require('fs');

console.log('=== Check backend /today route logic ===');

const routeContent = fs.readFileSync('/app/dist/routes/routines.js', 'utf8');

// Extract the /today route
const todayRouteMatch = routeContent.match(/router\.get\('\/today',[\s\S]*?(?=router\.|$)/);

if (todayRouteMatch) {
  console.log('Found /today route:');
  console.log(todayRouteMatch[0].substring(0, 1500));
  console.log('\n...\n');
} else {
  console.log('ERROR: Could not find /today route');
}

console.log('\n=== Check complete ===');
