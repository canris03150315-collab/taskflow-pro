const fs = require('fs');

console.log('=== Checking parseExcelFile Function ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
const content = fs.readFileSync(routePath, 'utf8');
const lines = content.split('\n');

console.log('Step 1: Checking imports at top of file...\n');

const imports = [];
for (let i = 0; i < Math.min(30, lines.length); i++) {
  if (lines[i].includes('require') || lines[i].includes('import')) {
    imports.push(`${i + 1}: ${lines[i]}`);
  }
}

console.log('Imports found:');
imports.forEach(line => console.log(line));

console.log('\n\nStep 2: Checking for parseExcelFile function...\n');

let foundParseFunction = false;
let parseFunctionCode = [];

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function parseExcelFile') || lines[i].includes('const parseExcelFile')) {
    foundParseFunction = true;
    console.log(`Found parseExcelFile at line ${i + 1}`);
    
    // Get next 30 lines
    for (let j = i; j < Math.min(i + 30, lines.length); j++) {
      parseFunctionCode.push(`${j + 1}: ${lines[j]}`);
    }
    break;
  }
}

if (foundParseFunction) {
  console.log('\nFunction code:');
  parseFunctionCode.forEach(line => console.log(line));
} else {
  console.log('❌ parseExcelFile function NOT FOUND');
}

console.log('\n\nStep 3: Checking if xlsx is used...\n');

const hasXlsx = content.includes('xlsx') || content.includes('XLSX');
console.log('xlsx library referenced:', hasXlsx);

if (!hasXlsx) {
  console.log('❌ xlsx library is NOT imported or used');
}

console.log('\n\nStep 4: Checking multer configuration...\n');

let foundUpload = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('multer(') || lines[i].includes('upload =')) {
    foundUpload = true;
    console.log(`Found multer config at line ${i + 1}: ${lines[i]}`);
  }
}

if (!foundUpload) {
  console.log('❌ multer configuration NOT FOUND');
}

console.log('\n=== Check Complete ===');
