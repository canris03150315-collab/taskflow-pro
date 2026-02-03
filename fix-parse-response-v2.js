const fs = require('fs');

console.log('=== Fixing Parse Response Format V2 ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(routePath, 'utf8');

console.log('Step 1: Finding and replacing response...');

const lines = content.split('\n');
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('res.json({') && i > 80 && i < 150) {
        startIdx = i;
        for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].includes('});') && lines[j].trim() === '});') {
                endIdx = j;
                break;
            }
        }
        break;
    }
}

if (startIdx !== -1 && endIdx !== -1) {
    console.log(`  Found response at lines ${startIdx + 1} to ${endIdx + 1}`);
    
    const newResponseLines = [
        '    res.json({',
        '      success: true,',
        '      total: records.length,',
        '      newRecords: newRecords,',
        '      duplicates: duplicates,',
        '      hasConflicts: duplicates.length > 0,',
        '      fileName: req.file.originalname',
        '    });'
    ];
    
    lines.splice(startIdx, endIdx - startIdx + 1, ...newResponseLines);
    
    const newContent = lines.join('\n');
    fs.writeFileSync(routePath, newContent, 'utf8');
    
    console.log('  Response replaced');
    
    console.log('\nStep 2: Verifying...');
    const verify = fs.readFileSync(routePath, 'utf8');
    const hasConflicts = verify.includes('hasConflicts: duplicates.length > 0');
    const hasFileName = verify.includes('fileName: req.file.originalname');
    const hasDuplicates = verify.includes('duplicates: duplicates,');
    
    console.log(`  - hasConflicts: ${hasConflicts}`);
    console.log(`  - fileName: ${hasFileName}`);
    console.log(`  - duplicates: ${hasDuplicates}`);
    
    if (hasConflicts && hasFileName && hasDuplicates) {
        console.log('\n  Verification PASSED');
    } else {
        console.log('\n  Verification FAILED');
        process.exit(1);
    }
} else {
    console.log('  ERROR: Could not find response block');
    process.exit(1);
}

console.log('\n=== Fix Complete ===');
