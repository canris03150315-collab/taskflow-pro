const fs = require('fs');

console.log('=== Check toggle route implementation ===');

const content = fs.readFileSync('/app/dist/routes/routines.js', 'utf8');

// Find the toggle route
const toggleMatch = content.match(/router\.post\('\/records\/:recordId\/toggle'[\s\S]*?(?=router\.|module\.exports)/);

if (toggleMatch) {
  console.log('Found toggle route:');
  console.log(toggleMatch[0].substring(0, 1000));
} else {
  console.log('ERROR: Toggle route not found');
}

console.log('\n=== Check complete ===');
