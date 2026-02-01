const fs = require('fs');

console.log('=== Deep Authentication Diagnosis ===\n');

console.log('Step 1: Check if middleware/auth exists...');
const authPath = '/app/dist/middleware/auth.js';
if (fs.existsSync(authPath)) {
    console.log('  ✅ middleware/auth.js EXISTS');
    const authContent = fs.readFileSync(authPath, 'utf8');
    console.log('\n  First 50 lines of auth.js:');
    authContent.split('\n').slice(0, 50).forEach((line, idx) => {
        console.log(`    ${idx + 1}: ${line}`);
    });
} else {
    console.log('  ❌ middleware/auth.js DOES NOT EXIST');
    console.log('  This is the problem! Need to check alternative paths.');
}

console.log('\n\nStep 2: Check platform-revenue.js current state...');
const routePath = '/app/dist/routes/platform-revenue.js';
const routeContent = fs.readFileSync(routePath, 'utf8');
const routeLines = routeContent.split('\n');

console.log('  First 30 lines:');
routeLines.slice(0, 30).forEach((line, idx) => {
    console.log(`    ${idx + 1}: ${line}`);
});

console.log('\n\nStep 3: Check kol.js for comparison...');
const kolPath = '/app/dist/routes/kol.js';
const kolContent = fs.readFileSync(kolPath, 'utf8');
const kolLines = kolContent.split('\n');

console.log('  First 10 lines of kol.js:');
kolLines.slice(0, 10).forEach((line, idx) => {
    console.log(`    ${idx + 1}: ${line}`);
});

console.log('\n\nStep 4: Search for authenticateToken in entire codebase...');
const { execSync } = require('child_process');
try {
    const result = execSync('find /app/dist -name "*.js" -type f -exec grep -l "authenticateToken" {} \\; 2>/dev/null', {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024
    });
    console.log('  Files containing authenticateToken:');
    result.split('\n').filter(f => f).forEach(file => {
        console.log(`    - ${file}`);
    });
} catch (err) {
    console.log('  Search failed:', err.message);
}

console.log('\n\nStep 5: Check how kol.js actually imports auth...');
const kolAuthImport = kolLines.find(line => line.includes('authenticateToken'));
console.log(`  kol.js import: ${kolAuthImport}`);

const routeAuthImport = routeLines.find(line => line.includes('authenticateToken'));
console.log(`  platform-revenue.js import: ${routeAuthImport}`);

console.log('\n=== Diagnosis Complete ===');
