const fs = require('fs');

console.log('=== Diagnosing Finance Confirm Endpoint ===\n');

const routePath = '/app/dist/routes/finance.js';

if (!fs.existsSync(routePath)) {
  console.log('ERROR: Finance route file not found');
  process.exit(1);
}

const content = fs.readFileSync(routePath, 'utf8');
const lines = content.split('\n');

console.log('Step 1: Checking all registered endpoints...\n');

const endpoints = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('router.post(') || line.includes('router.get(') || line.includes('router.delete(') || line.includes('router.put(')) {
    const match = line.match(/router\.(post|get|delete|put)\(['"]([^'"]+)['"]/);
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

console.log('\nStep 2: Checking for confirm endpoint...\n');

const hasConfirm = endpoints.find(ep => ep.path.includes('confirm'));
if (hasConfirm) {
  console.log(`  FOUND: ${hasConfirm.method} ${hasConfirm.path}`);
  
  const confirmLine = lines[hasConfirm.line - 1];
  console.log(`\n  Line ${hasConfirm.line}: ${confirmLine.trim()}`);
  
  for (let i = hasConfirm.line; i < Math.min(hasConfirm.line + 20, lines.length); i++) {
    console.log(`  Line ${i + 1}: ${lines[i]}`);
    if (lines[i].includes('});') && lines[i].trim() === '});') {
      break;
    }
  }
} else {
  console.log('  NOT FOUND: POST /:id/confirm endpoint is missing');
}

console.log('\nStep 3: Checking expected endpoint format...\n');
console.log('  Frontend expects: POST /finance/:id/confirm');
console.log('  Example: POST /finance/finance-1769960168538-kyhze0r03/confirm');

if (!hasConfirm) {
  console.log('\n  ACTION REQUIRED: Need to add confirm endpoint');
}

console.log('\n=== Diagnosis Complete ===');
