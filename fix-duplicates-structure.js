const fs = require('fs');

console.log('=== Fixing Duplicates Structure ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(routePath, 'utf8');

console.log('Step 1: Finding duplicates.push block...');

const oldPush = `        if (Object.keys(differences).length > 0) {
          duplicates.push({
            platform_name: record.platform_name,
            date: record.date,
            differences: differences
          });
        }`;

const newPush = `        if (Object.keys(differences).length > 0) {
          duplicates.push({
            platform: record.platform_name,
            date: record.date,
            existing: existing,
            new: record,
            differences: differences
          });
        }`;

if (content.includes('platform_name: record.platform_name,')) {
    content = content.replace(oldPush, newPush);
    console.log('  Duplicates structure updated');
    
    fs.writeFileSync(routePath, content, 'utf8');
    console.log('  File saved');
    
    console.log('\nStep 2: Verifying changes...');
    const verify = fs.readFileSync(routePath, 'utf8');
    const hasPlatform = verify.includes('platform: record.platform_name');
    const hasExisting = verify.includes('existing: existing,');
    const hasNew = verify.includes('new: record,');
    
    console.log(`  - platform field: ${hasPlatform}`);
    console.log(`  - existing field: ${hasExisting}`);
    console.log(`  - new field: ${hasNew}`);
    
    if (hasPlatform && hasExisting && hasNew) {
        console.log('\n  Verification PASSED');
    } else {
        console.log('\n  Verification FAILED');
        process.exit(1);
    }
} else {
    console.log('  Pattern not found, checking if already fixed...');
    if (content.includes('platform: record.platform_name')) {
        console.log('  Already fixed!');
    } else {
        console.log('  ERROR: Cannot find pattern');
        process.exit(1);
    }
}

console.log('\n=== Fix Complete ===');
