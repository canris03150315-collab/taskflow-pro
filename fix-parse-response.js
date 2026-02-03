const fs = require('fs');

console.log('=== Fixing Parse Response Format ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(routePath, 'utf8');

console.log('Step 1: Fixing response format...');

const oldResponse = `    res.json({
      success: true,
      total: records.length,
      new: newRecords.length,
      duplicates: duplicates.length,
      newRecords: newRecords,
      duplicateRecords: duplicates
    });`;

const newResponse = `    res.json({
      success: true,
      total: records.length,
      newRecords: newRecords,
      duplicates: duplicates,
      hasConflicts: duplicates.length > 0,
      fileName: req.file.originalname
    });`;

if (content.includes('duplicateRecords: duplicates')) {
    content = content.replace(oldResponse, newResponse);
    console.log('  Response format updated');
    
    fs.writeFileSync(routePath, content, 'utf8');
    console.log('  File saved');
    
    console.log('\nStep 2: Verifying changes...');
    const verifyContent = fs.readFileSync(routePath, 'utf8');
    const hasConflicts = verifyContent.includes('hasConflicts');
    const hasFileName = verifyContent.includes('fileName');
    const hasDuplicates = verifyContent.includes('duplicates: duplicates');
    
    if (hasConflicts && hasFileName && hasDuplicates) {
        console.log('  Verification PASSED');
        console.log('  - hasConflicts: true');
        console.log('  - fileName: true');
        console.log('  - duplicates format: correct');
    } else {
        console.log('  Verification FAILED');
        process.exit(1);
    }
} else {
    console.log('  Pattern not found, checking if already fixed...');
    if (content.includes('hasConflicts') && content.includes('fileName')) {
        console.log('  Already fixed!');
    } else {
        console.log('  ERROR: Cannot find pattern to replace');
        process.exit(1);
    }
}

console.log('\n=== Fix Complete ===');
