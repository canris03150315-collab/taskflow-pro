const fs = require('fs');

console.log('=== Checking PUT /contracts/:id Route ===\n');

const filePath = '/app/dist/routes/kol.js';
const content = fs.readFileSync(filePath, 'utf8');

// Find PUT route
const putRouteMatch = content.match(/router\.put\(['"]\/contracts\/:id['"],[\s\S]{0,1500}?\}\s*\);/);

if (putRouteMatch) {
  console.log('Found PUT /contracts/:id route:');
  console.log('---');
  console.log(putRouteMatch[0]);
  console.log('---\n');
  
  // Check if it includes cleared_amount and total_paid
  if (putRouteMatch[0].includes('cleared_amount')) {
    console.log('✅ cleared_amount: FOUND');
  } else {
    console.log('❌ cleared_amount: NOT FOUND - This is the problem!');
  }
  
  if (putRouteMatch[0].includes('total_paid')) {
    console.log('✅ total_paid: FOUND');
  } else {
    console.log('❌ total_paid: NOT FOUND - This is the problem!');
  }
} else {
  console.log('❌ PUT route not found');
}

console.log('\n=== Check Complete ===');
