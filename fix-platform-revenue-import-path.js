const fs = require('fs');

console.log('=== Fixing Platform Revenue Import Path ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(routePath, 'utf8');

console.log('Step 1: Checking current import statement...');
const lines = content.split('\n');
const importLine = lines.find(line => line.includes('db-adapter'));
console.log(`  Current: ${importLine}`);

console.log('\nStep 2: Fixing import path...');
// Fix the import path from '../db-adapter' to './db-adapter'
content = content.replace(
    "const { dbCall } = require('../db-adapter');",
    "const { dbCall } = require('./db-adapter');"
);

console.log('  Changed: ../db-adapter -> ./db-adapter');

console.log('\nStep 3: Writing changes to file...');
fs.writeFileSync(routePath, content, 'utf8');
console.log('  ✅ File updated successfully');

console.log('\nStep 4: Verifying changes...');
const verifyContent = fs.readFileSync(routePath, 'utf8');
if (verifyContent.includes("require('./db-adapter')")) {
    console.log('  ✅ Verification PASSED');
    console.log('  Import path is now correct: ./db-adapter');
} else {
    console.log('  ❌ Verification FAILED');
    process.exit(1);
}

console.log('\n=== Fix Complete ===');
console.log('\nNext steps:');
console.log('  1. Restart container: docker restart taskflow-pro');
console.log('  2. Create new image: docker commit taskflow-pro taskflow-pro:v8.9.193-platform-revenue-fixed');
console.log('  3. Verify container starts successfully');
