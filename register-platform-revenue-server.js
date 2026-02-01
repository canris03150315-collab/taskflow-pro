const fs = require('fs');

console.log('=== Registering Platform Revenue Route in server.js ===\n');

const serverPath = '/app/dist/server.js';
let content = fs.readFileSync(serverPath, 'utf8');

console.log('Step 1: Checking if route already registered...');
if (content.includes('platform-revenue')) {
  console.log('  - Route already registered, skipping...');
  process.exit(0);
}

console.log('Step 2: Adding require statement...');
const requirePattern = /const schedules_1 = require\("\.\/routes\/schedules"\);/;
const requireReplacement = `const schedules_1 = require("./routes/schedules");
const platformRevenueRoutes = require("./routes/platform-revenue");`;

content = content.replace(requirePattern, requireReplacement);
console.log('  - Added require statement');

console.log('\nStep 3: Adding route registration...');
const routePattern = /this\.app\.use\('\/api\/backup', require\('\.\/routes\/backup'\)\);/;
const routeReplacement = `this.app.use('/api/backup', require('./routes/backup'));
        this.app.use('/api/platform-revenue', platformRevenueRoutes);`;

content = content.replace(routePattern, routeReplacement);
console.log('  - Added route registration');

console.log('\nStep 4: Writing changes to file...');
fs.writeFileSync(serverPath, content, 'utf8');
console.log('  - File updated successfully');

console.log('\nStep 5: Verifying changes...');
const verifyContent = fs.readFileSync(serverPath, 'utf8');

if (verifyContent.includes('platformRevenueRoutes') && 
    verifyContent.includes("'/api/platform-revenue'")) {
  console.log('  ✅ Verification PASSED');
  console.log('\n=== Registration Complete ===');
} else {
  console.log('  ❌ Verification FAILED');
  process.exit(1);
}
