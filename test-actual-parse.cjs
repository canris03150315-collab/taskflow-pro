const xlsx = require('xlsx');
const fs = require('fs');

console.log('=== Testing Actual Parse Logic ===\n');

const filePath = 'C:\\Users\\USER\\Downloads\\平台帳變(備).xlsx';
const fileBuffer = fs.readFileSync(filePath);

const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const range = xlsx.utils.decode_range(worksheet['!ref']);

console.log('Range:', range);
console.log('Total rows:', range.e.r + 1);
console.log('Total columns:', range.e.c + 1);
console.log('');

console.log('Step 1: Check platform names (every 18 columns starting from col 1)\n');
const platformNames = [];
for (let col = 1; col <= range.e.c; col += 18) {
  const headerCell = worksheet[xlsx.utils.encode_cell({ r: 0, c: col })];
  if (headerCell && headerCell.v) {
    const platformName = String(headerCell.v).replace(/\t+/g, '').trim();
    console.log(`Col ${col}: "${platformName}"`);
    if (platformName) {
      platformNames.push({ name: platformName, startCol: col });
    }
  }
}

console.log('\nFound platforms:', platformNames.length);
console.log('');

console.log('Step 2: Check first data row (row 2)\n');
const row = 2;
const dateCell = worksheet[xlsx.utils.encode_cell({ r: row, c: 1 })];
console.log('Date cell (row 2, col 1):', dateCell ? dateCell.v : '[empty]');

if (platformNames.length > 0) {
  const platform = platformNames[0];
  console.log('\nChecking first platform:', platform.name);
  console.log('Base column:', platform.startCol);
  
  for (let offset = 0; offset <= 16; offset++) {
    const cell = worksheet[xlsx.utils.encode_cell({ r: row, c: platform.startCol + offset })];
    console.log(`  Offset ${offset} (col ${platform.startCol + offset}):`, cell ? cell.v : '[empty]');
  }
}

console.log('\nStep 3: Check what is in column 0 (first column)\n');
for (let r = 0; r <= 10; r++) {
  const cell = worksheet[xlsx.utils.encode_cell({ r: r, c: 0 })];
  console.log(`Row ${r}, Col 0:`, cell ? cell.v : '[empty]');
}

console.log('\n=== Test Complete ===');
