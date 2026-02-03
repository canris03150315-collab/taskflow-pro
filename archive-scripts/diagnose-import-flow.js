const fs = require('fs');

console.log('=== Diagnosing Import Flow ===\n');

console.log('Step 1: Checking backend /import endpoint expectations...\n');

const routePath = '/app/dist/routes/platform-revenue.js';
const content = fs.readFileSync(routePath, 'utf8');

const importStart = content.indexOf("router.post('/import'");
const importSection = content.substring(importStart, importStart + 500);

console.log('Backend expects:');
if (importSection.includes('const { records, overwrite }')) {
  console.log('  - records: Array');
  console.log('  - overwrite: boolean');
}

console.log('\nStep 2: Checking what frontend sends...\n');

const frontendPath = 'C:\\Users\\USER\\Downloads\\公司內部\\components\\RevenueUploadTab.tsx';
if (fs.existsSync(frontendPath)) {
  const frontendContent = fs.readFileSync(frontendPath, 'utf8');
  
  const bodyStart = frontendContent.indexOf('body: JSON.stringify({');
  if (bodyStart !== -1) {
    const bodySection = frontendContent.substring(bodyStart, bodyStart + 200);
    console.log('Frontend sends:');
    console.log(bodySection);
  }
}

console.log('\n=== Problem Identified ===\n');
console.log('Frontend sends: { records, action, fileName }');
console.log('Backend expects: { records, overwrite }');
console.log('\nMismatch: "action" vs "overwrite"');
console.log('Solution: Frontend should send "overwrite: action === \'overwrite\'"');

console.log('\n=== Diagnosis Complete ===');
