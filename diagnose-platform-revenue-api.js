const fs = require('fs');
const path = require('path');

console.log('=== Platform Revenue API Diagnosis ===\n');

// 1. Check if platform-revenue.js route file exists
const routePath = '/app/dist/routes/platform-revenue.js';
console.log('Step 1: Check route file existence');
console.log(`Checking: ${routePath}`);
if (fs.existsSync(routePath)) {
    console.log('✅ Route file EXISTS\n');
    
    // Read first 100 lines to check structure
    const content = fs.readFileSync(routePath, 'utf8');
    const lines = content.split('\n').slice(0, 100);
    console.log('First 100 lines of route file:');
    console.log('---');
    lines.forEach((line, idx) => {
        console.log(`${idx + 1}: ${line}`);
    });
    console.log('---\n');
} else {
    console.log('❌ Route file DOES NOT EXIST\n');
}

// 2. Check if route is registered in index.js
const indexPath = '/app/dist/index.js';
console.log('Step 2: Check route registration in index.js');
console.log(`Checking: ${indexPath}`);
if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const lines = indexContent.split('\n');
    
    console.log('\nSearching for platform-revenue registration...');
    let found = false;
    lines.forEach((line, idx) => {
        if (line.includes('platform-revenue') || line.includes('platformRevenue')) {
            console.log(`Line ${idx + 1}: ${line}`);
            found = true;
        }
    });
    
    if (!found) {
        console.log('❌ NO platform-revenue route registration found\n');
        
        // Show existing route registrations for reference
        console.log('Existing route registrations:');
        lines.forEach((line, idx) => {
            if (line.includes('app.use') && line.includes('/api/')) {
                console.log(`Line ${idx + 1}: ${line}`);
            }
        });
    } else {
        console.log('✅ Route registration FOUND\n');
    }
} else {
    console.log('❌ index.js DOES NOT EXIST\n');
}

// 3. List all route files
console.log('\nStep 3: List all route files in /app/dist/routes/');
const routesDir = '/app/dist/routes';
if (fs.existsSync(routesDir)) {
    const files = fs.readdirSync(routesDir);
    console.log('Available route files:');
    files.forEach(file => {
        console.log(`  - ${file}`);
    });
} else {
    console.log('❌ Routes directory does not exist');
}

console.log('\n=== Diagnosis Complete ===');
