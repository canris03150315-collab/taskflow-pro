const fs = require('fs');

const content = fs.readFileSync('/app/dist/routes/routines.js', 'utf8');

// Find the complete toggle route
const toggleMatch = content.match(/router\.post\('\/records\/:recordId\/toggle'[\s\S]*?\}\);/);

if (toggleMatch) {
  console.log('=== Toggle Route (Full) ===\n');
  console.log(toggleMatch[0]);
} else {
  console.log('Toggle route NOT FOUND');
}
