const fs = require('fs');

console.log('=== Fixing Duplicates Structure V3 ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(routePath, 'utf8');

console.log('Step 1: Using sed-style replacement...');

content = content.replace(
  /duplicates\.push\(\{\s+platform_name: record\.platform_name,\s+date: record\.date,\s+differences: differences\s+\}\);/,
  `duplicates.push({
            platform: record.platform_name,
            date: record.date,
            existing: existing,
            new: record,
            differences: differences
          });`
);

fs.writeFileSync(routePath, content, 'utf8');
console.log('  File updated');

console.log('\nStep 2: Verifying...');
const verify = fs.readFileSync(routePath, 'utf8');
const hasPlatform = verify.includes('platform: record.platform_name,');
const hasExisting = verify.includes('existing: existing,');
const hasNew = verify.includes('new: record,');

console.log(`  - platform: ${hasPlatform}`);
console.log(`  - existing: ${hasExisting}`);
console.log(`  - new: ${hasNew}`);

if (hasPlatform && hasExisting && hasNew) {
    console.log('\n  Verification PASSED');
} else {
    console.log('\n  Verification FAILED');
    process.exit(1);
}

console.log('\n=== Fix Complete ===');
