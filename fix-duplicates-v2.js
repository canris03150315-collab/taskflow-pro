const fs = require('fs');

console.log('=== Fixing Duplicates Structure V2 ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(routePath, 'utf8');

console.log('Step 1: Finding and replacing duplicates.push...');

const lines = content.split('\n');
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('if (Object.keys(differences).length > 0)')) {
        startIdx = i;
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
            if (lines[j].includes('});') && lines[j].trim() === '        }') {
                endIdx = j;
                break;
            }
        }
        break;
    }
}

if (startIdx !== -1 && endIdx !== -1) {
    console.log(`  Found duplicates.push at lines ${startIdx + 1} to ${endIdx + 1}`);
    
    const newLines = [
        '        if (Object.keys(differences).length > 0) {',
        '          duplicates.push({',
        '            platform: record.platform_name,',
        '            date: record.date,',
        '            existing: existing,',
        '            new: record,',
        '            differences: differences',
        '          });',
        '        }'
    ];
    
    lines.splice(startIdx, endIdx - startIdx + 1, ...newLines);
    
    const newContent = lines.join('\n');
    fs.writeFileSync(routePath, newContent, 'utf8');
    
    console.log('  Duplicates structure replaced');
    
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
} else {
    console.log('  ERROR: Could not find duplicates.push block');
    process.exit(1);
}

console.log('\n=== Fix Complete ===');
