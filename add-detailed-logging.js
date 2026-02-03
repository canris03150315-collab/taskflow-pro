const fs = require('fs');

console.log('=== Adding Detailed Logging to /parse Endpoint ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(routePath, 'utf8');

console.log('Step 1: Finding /parse endpoint...\n');

// Find the /parse endpoint
const parseStart = content.indexOf("router.post('/parse'");
if (parseStart === -1) {
  console.log('ERROR: /parse endpoint not found');
  process.exit(1);
}

console.log('Found /parse endpoint at position', parseStart);

// Find the try block start
const tryStart = content.indexOf('try {', parseStart);
const afterTry = tryStart + 'try {'.length;

// Add logging right after try {
const startLogging = `
    console.log('[PARSE] Request received');
    console.log('[PARSE] User:', req.user ? req.user.id : 'none');
    console.log('[PARSE] File:', req.file ? req.file.originalname : 'none');`;

// Find where parseExcelFile is called
const parseCallIndex = content.indexOf('const records = parseExcelFile(req.file.buffer);', parseStart);
if (parseCallIndex === -1) {
  console.log('ERROR: parseExcelFile call not found');
  process.exit(1);
}

// Add logging before parseExcelFile
const beforeParse = `
    console.log('[PARSE] Calling parseExcelFile...');
    `;

// Find the catch block
const catchStart = content.indexOf('} catch (error) {', parseStart);
const afterCatch = catchStart + '} catch (error) {'.length;

// Replace existing error log with detailed one
const detailedErrorLog = `
    console.error('[PARSE ERROR] Message:', error.message);
    console.error('[PARSE ERROR] Stack:', error.stack);
    console.error('[PARSE ERROR] File exists:', !!req.file);
    if (req.file) {
      console.error('[PARSE ERROR] File name:', req.file.originalname);
      console.error('[PARSE ERROR] File size:', req.file.size);
    }`;

// Build new content
let newContent = content.slice(0, afterTry) + startLogging + content.slice(afterTry);

// Recalculate positions after first insertion
const newParseCallIndex = newContent.indexOf('const records = parseExcelFile(req.file.buffer);', parseStart);
newContent = newContent.slice(0, newParseCallIndex) + beforeParse + newContent.slice(newParseCallIndex);

// Recalculate catch position
const newCatchStart = newContent.indexOf('} catch (error) {', parseStart);
const newAfterCatch = newCatchStart + '} catch (error) {'.length;

// Find and replace the existing console.error line
const existingErrorLog = newContent.indexOf("console.error('Parse error:', error);", newCatchStart);
if (existingErrorLog > newCatchStart && existingErrorLog < newCatchStart + 200) {
  const endOfLine = newContent.indexOf(';', existingErrorLog) + 1;
  newContent = newContent.slice(0, existingErrorLog) + detailedErrorLog + newContent.slice(endOfLine);
} else {
  // If not found, just add after catch
  newContent = newContent.slice(0, newAfterCatch) + detailedErrorLog + newContent.slice(newAfterCatch);
}

fs.writeFileSync(routePath, newContent, 'utf8');

console.log('\nStep 2: Verifying changes...\n');

const verify = fs.readFileSync(routePath, 'utf8');
const checks = [
  { text: '[PARSE] Request received', name: 'Start logging' },
  { text: '[PARSE] Calling parseExcelFile', name: 'Parse logging' },
  { text: '[PARSE ERROR]', name: 'Error logging' }
];

let allGood = true;
checks.forEach(check => {
  const exists = verify.includes(check.text);
  console.log(`${exists ? '✅' : '❌'} ${check.name}`);
  if (!exists) allGood = false;
});

if (allGood) {
  console.log('\n✅ All logging added successfully');
} else {
  console.log('\n❌ Some logging failed to add');
  process.exit(1);
}

console.log('\n=== Complete ===');
