const fs = require('fs');

console.log('=== Diagnosing 403 Error on /parse Endpoint ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
const content = fs.readFileSync(routePath, 'utf8');

console.log('Step 1: Checking /parse endpoint authentication...\n');

const lines = content.split('\n');
let foundParse = false;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("router.post('/parse'")) {
    foundParse = true;
    console.log(`Line ${i + 1}: ${lines[i]}`);
    
    if (lines[i].includes('authenticateToken')) {
      console.log('  ✅ authenticateToken middleware is present');
    } else {
      console.log('  ❌ authenticateToken middleware is MISSING');
    }
    
    if (lines[i].includes('upload.single')) {
      console.log('  ✅ upload.single middleware is present');
    }
    break;
  }
}

if (!foundParse) {
  console.log('ERROR: /parse endpoint not found');
  process.exit(1);
}

console.log('\nStep 2: Checking authenticateToken function...\n');

const authPath = '/app/dist/middleware/auth.js';
if (fs.existsSync(authPath)) {
  const authContent = fs.readFileSync(authPath, 'utf8');
  
  if (authContent.includes('function authenticateToken') || authContent.includes('const authenticateToken')) {
    console.log('  ✅ authenticateToken function exists in auth.js');
    
    const authLines = authContent.split('\n');
    for (let i = 0; i < Math.min(authLines.length, 50); i++) {
      if (authLines[i].includes('authenticateToken')) {
        console.log(`  Line ${i + 1}: ${authLines[i].trim()}`);
        if (i < authLines.length - 5) {
          for (let j = i + 1; j < Math.min(i + 10, authLines.length); j++) {
            if (authLines[j].includes('403') || authLines[j].includes('Forbidden')) {
              console.log(`  Line ${j + 1}: ${authLines[j].trim()}`);
            }
          }
        }
        break;
      }
    }
  } else {
    console.log('  ❌ authenticateToken function NOT FOUND in auth.js');
  }
} else {
  console.log('  ❌ auth.js file does not exist');
}

console.log('\nStep 3: Testing token validation...\n');

const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

const users = db.prepare('SELECT id, username, role FROM users LIMIT 5').all();
console.log('Sample users in database:');
users.forEach(u => console.log(`  - ${u.username} (${u.role})`));

db.close();

console.log('\n=== Diagnosis Complete ===');
console.log('\nPossible causes:');
console.log('1. Token not being sent correctly from frontend');
console.log('2. authenticateToken middleware rejecting valid tokens');
console.log('3. CORS or rate limiting issues');
