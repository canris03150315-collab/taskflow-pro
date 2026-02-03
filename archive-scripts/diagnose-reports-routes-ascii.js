const fs = require('fs');

console.log('=== Diagnosing Reports Routes ===\n');

// Check if reports.js exists
const reportsPath = '/app/dist/routes/reports.js';
if (!fs.existsSync(reportsPath)) {
  console.log('ERROR: reports.js does not exist!');
  process.exit(1);
}

// Read file content
const content = fs.readFileSync(reportsPath, 'utf8');

console.log('File exists: YES');
console.log('File size:', content.length, 'bytes\n');

// Check key routes
const routesToCheck = [
  { name: 'GET /', pattern: /router\.get\(['"]\/['"]/g },
  { name: 'POST /', pattern: /router\.post\(['"]\/['"]/g },
  { name: 'PUT /:id', pattern: /router\.put\(['"]\/(:id|:reportId)['"]/g },
  { name: 'DELETE /:id', pattern: /router\.delete\(['"]\/(:id|:reportId)['"]/g },
  { name: 'GET /approval/pending', pattern: /router\.get\(['"]\/approval\/pending['"]/g },
  { name: 'POST /approval/request', pattern: /router\.post\(['"]\/approval\/request['"]/g },
  { name: 'GET /approval/check', pattern: /router\.get\(['"]\/approval\/check['"]/g },
  { name: 'POST /approval/approve', pattern: /router\.post\(['"]\/approval\/approve['"]/g }
];

console.log('Checking for routes:\n');
routesToCheck.forEach(route => {
  const matches = content.match(route.pattern);
  const exists = matches && matches.length > 0;
  console.log(`  ${exists ? 'FOUND' : 'MISSING'} ${route.name}`);
});

// Check exports
console.log('\nExports:');
if (content.includes('module.exports')) {
  console.log('  FOUND module.exports');
} else {
  console.log('  MISSING module.exports');
}

// Show first 50 lines
console.log('\n=== First 50 lines of reports.js ===\n');
const lines = content.split('\n');
lines.slice(0, 50).forEach((line, i) => {
  console.log(`${(i + 1).toString().padStart(3, ' ')}: ${line}`);
});

console.log('\n=== Diagnosis Complete ===');
