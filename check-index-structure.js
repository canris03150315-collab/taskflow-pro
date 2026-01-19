const fs = require('fs');

console.log('Checking index.js structure...');

const indexPath = '/app/dist/index.js';
const content = fs.readFileSync(indexPath, 'utf8');

// Find all route registrations
const routeMatches = content.match(/app\.use\([^)]+\)/g);

if (routeMatches) {
  console.log('\nFound route registrations:');
  routeMatches.forEach((match, idx) => {
    console.log(`${idx + 1}. ${match}`);
  });
} else {
  console.log('No route registrations found with app.use pattern');
}

// Check for alternative patterns
const requireMatches = content.match(/require\(['"][^'"]+routes[^'"]+['"]\)/g);
if (requireMatches) {
  console.log('\nFound require statements for routes:');
  requireMatches.slice(0, 10).forEach((match, idx) => {
    console.log(`${idx + 1}. ${match}`);
  });
}

// Show a sample of the file around route registrations
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes("app.use('/api/") || line.includes('require(') && line.includes('routes')) {
    console.log(`\nLine ${idx + 1}: ${line}`);
  }
});
