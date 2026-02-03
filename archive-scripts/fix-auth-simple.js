const fs = require('fs');

console.log('=== Fixing Authentication in platform-revenue.js ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(routePath, 'utf8');

console.log('Step 1: Removing custom authenticateToken function...\n');

const funcStart = content.indexOf('function authenticateToken(req, res, next) {');
if (funcStart !== -1) {
  const funcEnd = content.indexOf('\n}\n', funcStart) + 3;
  content = content.slice(0, funcStart) + content.slice(funcEnd);
  console.log('Removed custom authenticateToken function');
}

console.log('\nStep 2: Adding correct import...\n');

if (!content.includes("const { authenticateToken } = require('../middleware/auth')")) {
  const afterUuid = content.indexOf("const { v4: uuidv4 } = require('uuid');");
  const insertPos = content.indexOf('\n', afterUuid) + 1;
  const authImport = "const { authenticateToken } = require('../middleware/auth');\n";
  content = content.slice(0, insertPos) + authImport + content.slice(insertPos);
  console.log('Added import');
}

fs.writeFileSync(routePath, content, 'utf8');

console.log('\nStep 3: Verifying...\n');
const verify = fs.readFileSync(routePath, 'utf8');

if (verify.includes("const { authenticateToken } = require('../middleware/auth')")) {
  console.log('OK: Import added');
} else {
  console.log('FAIL: Import missing');
  process.exit(1);
}

if (!verify.includes('function authenticateToken')) {
  console.log('OK: Custom function removed');
} else {
  console.log('FAIL: Custom function still exists');
  process.exit(1);
}

console.log('\n=== Complete ===');
