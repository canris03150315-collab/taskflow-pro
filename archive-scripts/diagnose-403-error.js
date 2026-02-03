const fs = require('fs');

console.log('=== Diagnosing 403 Forbidden Error ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
const content = fs.readFileSync(routePath, 'utf8');

console.log('Step 1: Checking authenticateToken middleware...\n');

const lines = content.split('\n');
let inAuthFunction = false;
let authFunctionLines = [];

lines.forEach((line, idx) => {
    if (line.includes('function authenticateToken')) {
        inAuthFunction = true;
    }
    if (inAuthFunction) {
        authFunctionLines.push(`${idx + 1}: ${line}`);
        if (line.includes('}') && authFunctionLines.length > 5) {
            inAuthFunction = false;
        }
    }
});

console.log('authenticateToken function:');
authFunctionLines.forEach(line => console.log(line));

console.log('\nStep 2: Checking if middleware is using correct auth...\n');

const hasAuthHeader = content.includes("req.headers['authorization']");
const hasJWT = content.includes('jsonwebtoken');
const hasAuthMiddleware = content.includes('require(\'../middleware/auth\')');

console.log(`  - Uses authorization header: ${hasAuthHeader}`);
console.log(`  - Uses jsonwebtoken: ${hasJWT}`);
console.log(`  - Uses middleware/auth: ${hasAuthMiddleware}`);

console.log('\nStep 3: Checking route definitions...\n');

const routeLines = lines.filter(line => 
    line.includes('router.post') || line.includes('router.get')
);

console.log('Route definitions:');
routeLines.forEach(line => console.log(`  ${line.trim()}`));

console.log('\n=== Diagnosis Complete ===');
console.log('\nProblem: authenticateToken is defined locally but may not match server auth');
console.log('Solution: Use the server\'s authenticateToken from middleware/auth');
