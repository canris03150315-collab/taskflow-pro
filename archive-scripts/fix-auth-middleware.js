const fs = require('fs');

console.log('=== Fixing Authentication Middleware ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(routePath, 'utf8');

console.log('Step 1: Removing local authenticateToken function...');

const authFunctionPattern = /function authenticateToken\(req, res, next\) \{[\s\S]*?\n\}/;
content = content.replace(authFunctionPattern, '');
console.log('  - Removed local authenticateToken function');

console.log('\nStep 2: Adding correct import...');

const importPattern = /(const { v4: uuidv4 } = require\('uuid'\);)/;
const importReplacement = `$1
const { authenticateToken } = require('../middleware/auth');`;

content = content.replace(importPattern, importReplacement);
console.log('  - Added: const { authenticateToken } = require(\'../middleware/auth\');');

console.log('\nStep 3: Writing changes to file...');
fs.writeFileSync(routePath, content, 'utf8');
console.log('  - File updated successfully');

console.log('\nStep 4: Verifying changes...');
const verifyContent = fs.readFileSync(routePath, 'utf8');

const hasCorrectImport = verifyContent.includes("require('../middleware/auth')");
const hasLocalAuth = verifyContent.includes('function authenticateToken');

if (hasCorrectImport && !hasLocalAuth) {
  console.log('  ✅ Verification PASSED');
  console.log('\n=== Fix Complete ===');
  console.log('Authentication middleware now uses server\'s authenticateToken');
} else {
  console.log('  ❌ Verification FAILED');
  console.log(`  - Has correct import: ${hasCorrectImport}`);
  console.log(`  - Has local auth (should be false): ${hasLocalAuth}`);
  process.exit(1);
}
