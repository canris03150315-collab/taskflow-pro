const fs = require('fs');

console.log('=== Checking KOL Contract Routes ===\n');

const kolRoutesPath = '/app/dist/routes/kol.js';

try {
  const content = fs.readFileSync(kolRoutesPath, 'utf8');
  
  // Check for PUT /contracts/:id route
  console.log('1. Checking PUT /contracts/:id (Update Contract):');
  if (content.includes("router.put('/contracts/:id'") || content.includes('router.put("/contracts/:id"')) {
    console.log('   ✅ FOUND\n');
  } else {
    console.log('   ❌ NOT FOUND - Need to add\n');
  }
  
  // Check for DELETE /contracts/:id route
  console.log('2. Checking DELETE /contracts/:id (Delete Contract):');
  if (content.includes("router.delete('/contracts/:id'") || content.includes('router.delete("/contracts/:id"')) {
    console.log('   ✅ FOUND\n');
  } else {
    console.log('   ❌ NOT FOUND - Need to add\n');
  }
  
  // List all contract-related routes
  console.log('3. All contract-related routes found:');
  const routeMatches = content.match(/router\.(get|post|put|delete)\(['"]\/contracts[^'"]*/g);
  if (routeMatches) {
    routeMatches.forEach(route => console.log('   -', route));
  } else {
    console.log('   - No routes found');
  }
  
  console.log('\n=== Check Complete ===');
} catch (error) {
  console.error('Error reading kol.js:', error.message);
}
