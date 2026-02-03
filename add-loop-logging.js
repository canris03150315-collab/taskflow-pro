const fs = require('fs');

console.log('=== Adding Loop Logging to /parse Endpoint ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(routePath, 'utf8');

const parseStart = content.indexOf("router.post('/parse'");

// Find the for loop
const forLoopIndex = content.indexOf('for (const record of records) {', parseStart);

if (forLoopIndex === -1) {
  console.log('ERROR: for loop not found');
  process.exit(1);
}

console.log('Found for loop at position', forLoopIndex);

// Add logging after for loop start
const afterForLoop = forLoopIndex + 'for (const record of records) {'.length;

const loopStartLog = `
      console.log('[PARSE] Processing record:', record.platform_name, record.date);`;

// Find where dbCall is made
const dbCallIndex = content.indexOf('const existing = dbCall(db,', forLoopIndex);
const afterDbCall = content.indexOf(');', dbCallIndex) + 2;

const dbCallLog = `
      console.log('[PARSE] Checking existing record...');`;

let newContent = content.slice(0, afterForLoop) + loopStartLog + content.slice(afterForLoop);

// Recalculate dbCall position
const newDbCallIndex = newContent.indexOf('const existing = dbCall(db,', forLoopIndex);
const newAfterDbCall = newContent.indexOf(');', newDbCallIndex) + 2;

newContent = newContent.slice(0, newAfterDbCall) + dbCallLog + newContent.slice(newAfterDbCall);

// Add logging before res.json
const resJsonIndex = newContent.indexOf('res.json({', parseStart);
const beforeResJson = newContent.lastIndexOf('\n', resJsonIndex);

const beforeResponseLog = `
    console.log('[PARSE] About to send response');
    console.log('[PARSE] Total:', records.length, 'New:', newRecords.length, 'Duplicates:', duplicates.length);
`;

newContent = newContent.slice(0, beforeResJson + 1) + beforeResponseLog + newContent.slice(beforeResJson + 1);

fs.writeFileSync(routePath, newContent, 'utf8');

console.log('\nVerifying...\n');

const verify = fs.readFileSync(routePath, 'utf8');
const checks = [
  '[PARSE] Processing record',
  '[PARSE] Checking existing',
  '[PARSE] About to send response'
];

let allGood = true;
checks.forEach(check => {
  const exists = verify.includes(check);
  console.log((exists ? 'OK' : 'FAIL') + ': ' + check);
  if (!exists) allGood = false;
});

if (!allGood) process.exit(1);

console.log('\n=== Complete ===');
