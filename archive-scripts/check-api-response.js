const fs = require('fs');

console.log('=== Checking Platform Revenue API Response ===\n');

console.log('Step 1: Check route file structure...');
const routePath = '/app/dist/routes/platform-revenue.js';

if (fs.existsSync(routePath)) {
    const content = fs.readFileSync(routePath, 'utf8');
    const lines = content.split('\n');
    
    console.log('  Route file exists');
    console.log('  Total lines:', lines.length);
    
    // Check parse endpoint
    console.log('\nStep 2: Checking /parse endpoint...');
    let inParseRoute = false;
    let parseLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes("router.post('/parse'")) {
            inParseRoute = true;
        }
        if (inParseRoute) {
            parseLines.push(`${i + 1}: ${line}`);
            if (line.includes('});') && parseLines.length > 10) {
                break;
            }
        }
    }
    
    console.log('  Parse route found:', parseLines.length > 0);
    if (parseLines.length > 0) {
        console.log('\n  Parse route code (first 30 lines):');
        parseLines.slice(0, 30).forEach(line => console.log(`    ${line}`));
    }
    
    // Check what the parse endpoint returns
    console.log('\nStep 3: Checking response structure...');
    const hasResJson = content.includes('res.json');
    const hasNewRecords = content.includes('newRecords');
    const hasDuplicates = content.includes('duplicates');
    const hasConflicts = content.includes('hasConflicts');
    
    console.log(`  - Uses res.json: ${hasResJson}`);
    console.log(`  - Returns newRecords: ${hasNewRecords}`);
    console.log(`  - Returns duplicates: ${hasDuplicates}`);
    console.log(`  - Returns hasConflicts: ${hasConflicts}`);
    
    // Check if response matches frontend expectations
    console.log('\nStep 4: Frontend expects:');
    console.log('  - ParseResult with: newRecords, duplicates, hasConflicts, fileName');
    
    if (!hasNewRecords || !hasDuplicates || !hasConflicts) {
        console.log('\n  WARNING: Response structure may not match frontend expectations!');
    }
    
} else {
    console.log('  ERROR: Route file not found!');
}

console.log('\n=== Diagnosis Complete ===');
