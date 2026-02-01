const fs = require('fs');

console.log('=== Registering Platform Revenue Route ===\n');

const serverPath = '/app/dist/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

// Step 1: Add require statement at the top with other route imports
console.log('Step 1: Adding require statement...');

const requirePattern = /const schedules_1 = require\("\.\/routes\/schedules"\);/;
const requireReplacement = `const schedules_1 = require("./routes/schedules");
const platformRevenueRoutes = require("./routes/platform-revenue");`;

if (content.includes('platformRevenueRoutes')) {
    console.log('  - Require statement already exists, skipping...');
} else {
    content = content.replace(requirePattern, requireReplacement);
    console.log('  - Added require statement');
}

// Step 2: Add route registration
console.log('\nStep 2: Adding route registration...');

const routePattern = /this\.app\.use\('\/api\/backup', require\('\.\/routes\/backup'\)\);/;
const routeReplacement = `this.app.use('/api/backup', require('./routes/backup'));
        this.app.use('/api/platform-revenue', platformRevenueRoutes);`;

if (content.includes("'/api/platform-revenue'")) {
    console.log('  - Route registration already exists, skipping...');
} else {
    content = content.replace(routePattern, routeReplacement);
    console.log('  - Added route registration');
}

// Step 3: Write back to file
console.log('\nStep 3: Writing changes to file...');
fs.writeFileSync(serverPath, content, 'utf8');
console.log('  - File updated successfully');

// Step 4: Verify changes
console.log('\nStep 4: Verifying changes...');
const verifyContent = fs.readFileSync(serverPath, 'utf8');

if (verifyContent.includes('platformRevenueRoutes') && 
    verifyContent.includes("'/api/platform-revenue'")) {
    console.log('  ✅ Verification PASSED');
    console.log('\nChanges applied:');
    console.log('  1. Added: const platformRevenueRoutes = require("./routes/platform-revenue");');
    console.log('  2. Added: this.app.use(\'/api/platform-revenue\', platformRevenueRoutes);');
} else {
    console.log('  ❌ Verification FAILED');
    process.exit(1);
}

console.log('\n=== Registration Complete ===');
console.log('\nNext steps:');
console.log('  1. Restart container: docker restart taskflow-pro');
console.log('  2. Create new image: docker commit taskflow-pro taskflow-pro:v8.9.193-platform-revenue-route-registered');
console.log('  3. Test API: POST /api/platform-revenue/parse');
