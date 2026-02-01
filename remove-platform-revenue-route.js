const fs = require('fs');

console.log('=== Removing Platform Revenue Route Registration ===\n');

const serverPath = '/app/dist/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

console.log('Step 1: Removing require statement...');
content = content.replace(/const platformRevenueRoutes = require\("\.\/routes\/platform-revenue"\);\n?/g, '');
console.log('  - Removed require statement');

console.log('\nStep 2: Removing route registration...');
content = content.replace(/\s*this\.app\.use\('\/api\/platform-revenue', platformRevenueRoutes\);\n?/g, '');
console.log('  - Removed route registration');

console.log('\nStep 3: Writing changes to file...');
fs.writeFileSync(serverPath, content, 'utf8');
console.log('  - File updated');

console.log('\n=== Removal Complete ===');
console.log('System should now start normally without platform-revenue route');
