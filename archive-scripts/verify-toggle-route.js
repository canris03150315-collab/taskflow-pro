const fs = require('fs');

console.log('=== Verify toggle route exists and is correct ===');

const content = fs.readFileSync('/app/dist/routes/routines.js', 'utf8');

// Check if toggle route exists
const hasToggle = content.includes("router.post('/records/:recordId/toggle'");
console.log('Toggle route exists:', hasToggle);

// Check exports location
const exportsIndex = content.indexOf('module.exports');
const lastRouterIndex = content.lastIndexOf('router.');

console.log('Exports at position:', exportsIndex);
console.log('Last router call at position:', lastRouterIndex);
console.log('Exports is after last router:', exportsIndex > lastRouterIndex);

if (!hasToggle) {
  console.log('\n❌ Toggle route is missing - need to add it');
} else {
  console.log('\n✅ Toggle route exists');
  
  // Show the toggle route
  const toggleMatch = content.match(/router\.post\('\/records\/:recordId\/toggle'[\s\S]*?\}\);/);
  if (toggleMatch) {
    console.log('\nToggle route preview:');
    console.log(toggleMatch[0].substring(0, 300) + '...');
  }
}

console.log('\n=== Verification complete ===');
