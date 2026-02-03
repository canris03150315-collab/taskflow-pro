const fs = require('fs');

console.log('=== Adding Success Response Logging ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(routePath, 'utf8');

console.log('Step 1: Finding res.json in /parse endpoint...\n');

const parseStart = content.indexOf("router.post('/parse'");
const parseEnd = content.indexOf('});', parseStart + 500);

// Find the res.json call
const resJsonIndex = content.indexOf('res.json({', parseStart);

if (resJsonIndex === -1 || resJsonIndex > parseEnd) {
  console.log('ERROR: res.json not found in /parse endpoint');
  process.exit(1);
}

console.log('Found res.json at position', resJsonIndex);

// Find the line before res.json
const beforeResJson = content.lastIndexOf('\n', resJsonIndex);

// Add logging before res.json
const successLog = `
    console.log('[PARSE] Success! Total records:', records.length);
    console.log('[PARSE] New records:', newRecords.length);
    console.log('[PARSE] Duplicates:', duplicates.length);
`;

const newContent = content.slice(0, beforeResJson + 1) + successLog + content.slice(beforeResJson + 1);

fs.writeFileSync(routePath, newContent, 'utf8');

console.log('\nStep 2: Verifying...\n');

const verify = fs.readFileSync(routePath, 'utf8');
if (verify.includes('[PARSE] Success!')) {
  console.log('✅ Success logging added');
} else {
  console.log('❌ Failed to add success logging');
  process.exit(1);
}

console.log('\n=== Complete ===');
