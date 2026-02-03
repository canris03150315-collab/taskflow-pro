const xlsx = require('xlsx');
const fs = require('fs');

console.log('=== Analyzing Excel File Structure ===\n');

const filePath = 'C:\\Users\\USER\\Downloads\\平台帳變(備).xlsx';

if (!fs.existsSync(filePath)) {
  console.log('ERROR: File not found:', filePath);
  process.exit(1);
}

console.log('File found:', filePath);
console.log('File size:', fs.statSync(filePath).size, 'bytes\n');

try {
  const workbook = xlsx.readFile(filePath);
  
  console.log('Step 1: Workbook Information');
  console.log('  Sheet names:', workbook.SheetNames);
  console.log('');
  
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  console.log('Step 2: Analyzing Sheet:', sheetName);
  const range = xlsx.utils.decode_range(worksheet['!ref']);
  console.log('  Range:', worksheet['!ref']);
  console.log('  Total rows:', range.e.r + 1);
  console.log('  Total columns:', range.e.c + 1);
  console.log('');
  
  console.log('Step 3: First Row (Headers) - First 20 columns');
  for (let col = 0; col <= Math.min(range.e.c, 19); col++) {
    const cell = worksheet[xlsx.utils.encode_cell({ r: 0, c: col })];
    if (cell) {
      console.log(`  Col ${col}: "${cell.v}" (type: ${cell.t})`);
    } else {
      console.log(`  Col ${col}: [empty]`);
    }
  }
  console.log('');
  
  console.log('Step 4: First Column (Dates) - First 10 rows');
  for (let row = 0; row <= Math.min(range.e.r, 9); row++) {
    const cell = worksheet[xlsx.utils.encode_cell({ r: row, c: 0 })];
    if (cell) {
      console.log(`  Row ${row}: "${cell.v}" (type: ${cell.t})`);
    } else {
      console.log(`  Row ${row}: [empty]`);
    }
  }
  console.log('');
  
  console.log('Step 5: Sample Data - Row 1 (first data row)');
  for (let col = 0; col <= Math.min(range.e.c, 15); col++) {
    const cell = worksheet[xlsx.utils.encode_cell({ r: 1, c: col })];
    if (cell) {
      console.log(`  Col ${col}: ${cell.v}`);
    }
  }
  console.log('');
  
  console.log('Step 6: Detecting Platform Names Pattern');
  console.log('  Checking every 11 columns starting from col 1:');
  for (let col = 1; col <= Math.min(range.e.c, 50); col += 11) {
    const cell = worksheet[xlsx.utils.encode_cell({ r: 0, c: col })];
    if (cell && cell.v) {
      console.log(`    Col ${col}: "${cell.v}"`);
    }
  }
  console.log('');
  
  console.log('Step 7: Full First Row Data');
  const firstRow = [];
  for (let col = 0; col <= range.e.c; col++) {
    const cell = worksheet[xlsx.utils.encode_cell({ r: 0, c: col })];
    firstRow.push(cell ? cell.v : null);
  }
  console.log('  All headers:', JSON.stringify(firstRow, null, 2));
  
} catch (error) {
  console.error('ERROR:', error.message);
  console.error('Stack:', error.stack);
}

console.log('\n=== Analysis Complete ===');
