const fs = require('fs');

console.log('=== Diagnosing All Platform Revenue Endpoints ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';

if (!fs.existsSync(routePath)) {
  console.log('ERROR: Route file not found');
  process.exit(1);
}

const content = fs.readFileSync(routePath, 'utf8');
const lines = content.split('\n');

console.log('Step 1: Checking all registered endpoints...\n');

const endpoints = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('router.post(') || line.includes('router.get(')) {
    const match = line.match(/router\.(post|get)\(['"]([^'"]+)['"]/);
    if (match) {
      endpoints.push({
        method: match[1].toUpperCase(),
        path: match[2],
        line: i + 1
      });
    }
  }
}

console.log('Registered endpoints:');
endpoints.forEach(ep => {
  console.log(`  ${ep.method} ${ep.path} (line ${ep.line})`);
});

console.log('\nStep 2: Checking frontend expected endpoints...\n');

const expectedEndpoints = [
  { method: 'POST', path: '/parse', description: 'Parse Excel file' },
  { method: 'POST', path: '/import', description: 'Import records' },
  { method: 'GET', path: '/platforms', description: 'Get platform list' },
  { method: 'GET', path: '/stats', description: 'Get statistics' },
  { method: 'GET', path: '/stats/by-date', description: 'Get date statistics' },
  { method: 'GET', path: '/stats/platform', description: 'Get platform statistics' },
  { method: 'GET', path: '/history', description: 'Get upload history' }
];

console.log('Expected endpoints:');
const missing = [];
expectedEndpoints.forEach(exp => {
  const found = endpoints.find(ep => ep.method === exp.method && ep.path === exp.path);
  if (found) {
    console.log(`  ${exp.method} ${exp.path} - FOUND`);
  } else {
    console.log(`  ${exp.method} ${exp.path} - MISSING`);
    missing.push(exp);
  }
});

if (missing.length > 0) {
  console.log('\nStep 3: Missing endpoints that need to be added:\n');
  missing.forEach(ep => {
    console.log(`  ${ep.method} ${ep.path} - ${ep.description}`);
  });
} else {
  console.log('\nAll endpoints are registered!');
}

console.log('\n=== Diagnosis Complete ===');
