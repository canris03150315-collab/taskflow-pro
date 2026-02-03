const fs = require('fs');

console.log('=== Fixing authenticateToken in platform-revenue.js ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(routePath, 'utf8');

console.log('Step 1: Removing custom authenticateToken function...\n');

// Find and remove the custom authenticateToken function
const funcStart = content.indexOf('function authenticateToken(req, res, next) {');
const funcEnd = content.indexOf('\n}', content.indexOf('return res.status(403)', funcStart)) + 2;

if (funcStart === -1) {
  console.log('Custom authenticateToken not found, checking if already using middleware...');
  if (content.includes("const { authenticateToken } = require('../middleware/auth')")) {
    console.log('✅ Already using correct middleware');
    process.exit(0);
  }
} else {
  console.log('Found custom authenticateToken, removing...');
  content = content.slice(0, funcStart) + content.slice(funcEnd + 1);
}

console.log('\nStep 2: Adding correct import...\n');

// Check if import already exists
if (!content.includes("const { authenticateToken } = require('../middleware/auth')")) {
  // Add after other requires
  const afterUuid = content.indexOf("const { v4: uuidv4 } = require('uuid');");
  const insertPos = content.indexOf('\n', afterUuid) + 1;
  
  const authImport = "const { authenticateToken } = require('../middleware/auth');\n";
  
  content = content.slice(0, insertPos) + authImport + content.slice(insertPos);
  console.log('Added authenticateToken import');
} else {
  console.log('Import already exists');
}

fs.writeFileSync(routePath, content, 'utf8');

console.log('\nStep 3: Verifying...\n');

const verify = fs.readFileSync(routePath, 'utf8');

const checks = [
  { text: "const { authenticateToken } = require('../middleware/auth')", name: 'Import statement' },
  { text: 'function authenticateToken', name: 'Custom function (should NOT exist)', shouldNotExist: true }
];

let allGood = true;
checks.forEach(check => {
  const exists = verify.includes(check.text);
  if (check.shouldNotExist) {
    if (!exists) {
      console.log('✅', check.name, '- correctly removed');
    } else {
      console.log('❌', check.name, '- still exists!');
      allGood = false;
    }
  } else {
    if (exists) {
      console.log('✅', check.name, '- present');
    } else {
      console.log('❌', check.name, '- missing!');
      allGood = false;
    }
  }
});

if (!allGood) {
  console.log('\n❌ Verification failed');
  process.exit(1);
}

console.log('\n=== Fix Complete ===');
