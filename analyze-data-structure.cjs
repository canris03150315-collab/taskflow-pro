const xlsx = require('xlsx');
const fs = require('fs');

console.log('=== Analyzing Actual Data Structure ===\n');

const filePath = 'C:\\Users\\USER\\Downloads\\平台帳變(備).xlsx';
const fileBuffer = fs.readFileSync(filePath);

const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
const worksheet = workbook.Sheets[workbook.SheetNames[0]];

console.log('Row 4 (first data row) - First platform (col 1-18):\n');

for (let col = 1; col <= 18; col++) {
  const headerCell = worksheet[xlsx.utils.encode_cell({ r: 1, c: col })];
  const dataCell = worksheet[xlsx.utils.encode_cell({ r: 4, c: col })];
  
  const header = headerCell && headerCell.v ? headerCell.v : '[empty]';
  const data = dataCell && dataCell.v !== undefined ? dataCell.v : '[empty]';
  
  console.log(`Col ${col}: ${header} = ${data}`);
}

console.log('\n\nRow 5 (second data row) - First platform (col 1-18):\n');

for (let col = 1; col <= 18; col++) {
  const headerCell = worksheet[xlsx.utils.encode_cell({ r: 1, c: col })];
  const dataCell = worksheet[xlsx.utils.encode_cell({ r: 5, c: col })];
  
  const header = headerCell && headerCell.v ? headerCell.v : '[empty]';
  const data = dataCell && dataCell.v !== undefined ? dataCell.v : '[empty]';
  
  console.log(`Col ${col}: ${header} = ${data}`);
}

console.log('\n\nChecking which month/year this data is for...\n');
console.log('Looking for date indicators in the sheet...\n');

// Check for any cell containing year/month info
for (let row = 0; row <= 10; row++) {
  for (let col = 0; col <= 30; col++) {
    const cell = worksheet[xlsx.utils.encode_cell({ r: row, c: col })];
    if (cell && cell.v && typeof cell.v === 'string') {
      if (cell.v.includes('202') || cell.v.includes('月') || cell.v.includes('年')) {
        console.log(`Found at Row ${row}, Col ${col}: "${cell.v}"`);
      }
    }
  }
}

console.log('\n=== Complete ===');
