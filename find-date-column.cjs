const xlsx = require('xlsx');
const fs = require('fs');

console.log('=== Finding Date Column ===\n');

const filePath = 'C:\\Users\\USER\\Downloads\\平台帳變(備).xlsx';
const fileBuffer = fs.readFileSync(filePath);

const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const range = xlsx.utils.decode_range(worksheet['!ref']);

console.log('Checking row 2 for date values...\n');

for (let col = 0; col <= 20; col++) {
  const cell = worksheet[xlsx.utils.encode_cell({ r: 2, c: col })];
  if (cell && cell.v) {
    console.log(`Col ${col}:`, cell.v, `(type: ${cell.t})`);
  }
}

console.log('\nChecking row 3...\n');

for (let col = 0; col <= 20; col++) {
  const cell = worksheet[xlsx.utils.encode_cell({ r: 3, c: col })];
  if (cell && cell.v) {
    console.log(`Col ${col}:`, cell.v, `(type: ${cell.t})`);
  }
}

console.log('\nChecking all rows in column 0...\n');

for (let row = 0; row <= 20; row++) {
  const cell = worksheet[xlsx.utils.encode_cell({ r: row, c: 0 })];
  if (cell && cell.v) {
    console.log(`Row ${row}:`, cell.v, `(type: ${cell.t})`);
  }
}

console.log('\n=== Complete ===');
