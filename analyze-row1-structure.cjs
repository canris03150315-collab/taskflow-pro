const xlsx = require('xlsx');
const fs = require('fs');

console.log('=== Analyzing Row 1 (Field Headers) Structure ===\n');

const filePath = 'C:\\Users\\USER\\Downloads\\平台帳變(備).xlsx';
const fileBuffer = fs.readFileSync(filePath);

const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const range = xlsx.utils.decode_range(worksheet['!ref']);

console.log('Row 1 (field headers) - First platform section (col 0-20):\n');

for (let col = 0; col <= 20; col++) {
  const cell = worksheet[xlsx.utils.encode_cell({ r: 1, c: col })];
  if (cell && cell.v) {
    console.log(`Col ${col}: "${cell.v}"`);
  } else {
    console.log(`Col ${col}: [empty]`);
  }
}

console.log('\n\nNow checking where actual data starts...\n');
console.log('Looking for numeric values in first 30 rows, col 0-5:\n');

for (let row = 0; row <= 30; row++) {
  let hasData = false;
  let rowData = `Row ${row}: `;
  
  for (let col = 0; col <= 5; col++) {
    const cell = worksheet[xlsx.utils.encode_cell({ r: row, c: col })];
    if (cell && cell.v !== undefined) {
      rowData += `[${col}]=${cell.v} `;
      hasData = true;
    }
  }
  
  if (hasData) {
    console.log(rowData);
  }
}

console.log('\n\nChecking for date-like values in all columns of row 4:\n');

for (let col = 0; col <= 20; col++) {
  const cell = worksheet[xlsx.utils.encode_cell({ r: 4, c: col })];
  if (cell && cell.v) {
    console.log(`Col ${col}: ${cell.v} (type: ${cell.t})`);
  }
}

console.log('\n=== Complete ===');
