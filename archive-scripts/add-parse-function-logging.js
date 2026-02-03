const fs = require('fs');

console.log('=== Adding Logging to parseExcelFile Function ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(routePath, 'utf8');

const funcStart = content.indexOf('function parseExcelFile(buffer) {');
const funcBody = funcStart + 'function parseExcelFile(buffer) {'.length;

const initialLog = `
  console.log('[parseExcelFile] Starting parse...');
  `;

const afterWorkbook = content.indexOf('const workbook = xlsx.read(buffer', funcStart);
const afterWorkbookLine = content.indexOf(';', afterWorkbook) + 1;

const workbookLog = `
  console.log('[parseExcelFile] Workbook loaded, sheets:', workbook.SheetNames);
  `;

const afterRange = content.indexOf('const range = xlsx.utils.decode_range', funcStart);
const afterRangeLine = content.indexOf(';', afterRange) + 1;

const rangeLog = `
  console.log('[parseExcelFile] Range:', worksheet['!ref'], 'Rows:', range.e.r + 1, 'Cols:', range.e.c + 1);
  `;

const afterPlatformLoop = content.indexOf('const platformNames = [];', funcStart);
const platformLoopEnd = content.indexOf('}', content.indexOf('for (let col = 1; col < range.e.c; col += 11)', funcStart)) + 1;

const platformLog = `
  console.log('[parseExcelFile] Platform names found:', platformNames.length, platformNames);
  `;

const beforeRecordsLoop = content.indexOf('for (let row = 1; row <= range.e.r; row++)', funcStart);
const afterRecordsDeclaration = content.indexOf('const records = [];', funcStart) + 'const records = [];'.length;

const recordsLog = `
  console.log('[parseExcelFile] Starting to process rows...');
  `;

const beforeReturn = content.indexOf('return records;', funcStart);

const returnLog = `
  console.log('[parseExcelFile] Returning', records.length, 'records');
  `;

let newContent = content.slice(0, funcBody) + initialLog + content.slice(funcBody);

let offset = initialLog.length;
newContent = newContent.slice(0, afterWorkbookLine + offset) + workbookLog + newContent.slice(afterWorkbookLine + offset);

offset += workbookLog.length;
newContent = newContent.slice(0, afterRangeLine + offset) + rangeLog + newContent.slice(afterRangeLine + offset);

offset += rangeLog.length;
const newPlatformLoopEnd = platformLoopEnd + offset;
newContent = newContent.slice(0, newPlatformLoopEnd) + platformLog + newContent.slice(newPlatformLoopEnd);

offset += platformLog.length;
const newAfterRecordsDeclaration = afterRecordsDeclaration + offset;
newContent = newContent.slice(0, newAfterRecordsDeclaration) + recordsLog + newContent.slice(newAfterRecordsDeclaration);

offset += recordsLog.length;
const newBeforeReturn = beforeReturn + offset;
newContent = newContent.slice(0, newBeforeReturn) + returnLog + newContent.slice(newBeforeReturn);

fs.writeFileSync(routePath, newContent, 'utf8');

console.log('Verifying...\n');

const verify = fs.readFileSync(routePath, 'utf8');
const checks = [
  '[parseExcelFile] Starting parse',
  '[parseExcelFile] Workbook loaded',
  '[parseExcelFile] Range:',
  '[parseExcelFile] Platform names found',
  '[parseExcelFile] Returning'
];

let allGood = true;
checks.forEach(check => {
  const exists = verify.includes(check);
  console.log((exists ? 'OK' : 'FAIL') + ': ' + check);
  if (!exists) allGood = false;
});

if (!allGood) process.exit(1);

console.log('\n=== Complete ===');
