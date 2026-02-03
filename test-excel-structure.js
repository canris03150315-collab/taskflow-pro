const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

console.log('=== Testing Excel File Structure ===\n');

// Find the most recent xlsx file in uploads
const uploadsDir = '/app/data/uploads';

if (!fs.existsSync(uploadsDir)) {
  console.log('ERROR: Uploads directory does not exist');
  process.exit(1);
}

const files = fs.readdirSync(uploadsDir)
  .filter(f => f.endsWith('.xlsx'))
  .map(f => ({
    name: f,
    path: path.join(uploadsDir, f),
    mtime: fs.statSync(path.join(uploadsDir, f)).mtime
  }))
  .sort((a, b) => b.mtime - a.mtime);

if (files.length === 0) {
  console.log('ERROR: No xlsx files found in uploads directory');
  process.exit(1);
}

const testFile = files[0];
console.log('Testing file:', testFile.name);
console.log('Modified:', testFile.mtime);
console.log('');

try {
  const buffer = fs.readFileSync(testFile.path);
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  
  console.log('Step 1: Workbook info');
  console.log('  Sheet names:', workbook.SheetNames);
  console.log('');
  
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const range = xlsx.utils.decode_range(worksheet['!ref']);
  
  console.log('Step 2: Sheet range');
  console.log('  Range:', worksheet['!ref']);
  console.log('  Start row:', range.s.r, 'Start col:', range.s.c);
  console.log('  End row:', range.e.r, 'End col:', range.e.c);
  console.log('');
  
  console.log('Step 3: First row (headers)');
  for (let col = 0; col <= Math.min(range.e.c, 20); col++) {
    const cell = worksheet[xlsx.utils.encode_cell({ r: 0, c: col })];
    if (cell && cell.v) {
      console.log(`  Col ${col}: "${cell.v}"`);
    }
  }
  console.log('');
  
  console.log('Step 4: First column (dates)');
  for (let row = 0; row <= Math.min(range.e.r, 10); row++) {
    const cell = worksheet[xlsx.utils.encode_cell({ r: row, c: 0 })];
    if (cell && cell.v) {
      console.log(`  Row ${row}: "${cell.v}"`);
    }
  }
  console.log('');
  
  console.log('Step 5: Checking platform name extraction logic');
  const platformNames = [];
  for (let col = 1; col < range.e.c; col += 11) {
    const headerCell = worksheet[xlsx.utils.encode_cell({ r: 0, c: col })];
    if (headerCell && headerCell.v) {
      platformNames.push(headerCell.v);
      console.log(`  Found platform at col ${col}: "${headerCell.v}"`);
    }
  }
  console.log('  Total platforms found:', platformNames.length);
  console.log('');
  
  console.log('Step 6: Checking date extraction logic');
  let dateCount = 0;
  for (let row = 1; row <= range.e.r; row++) {
    const dateCell = worksheet[xlsx.utils.encode_cell({ r: row, c: 0 })];
    if (dateCell && dateCell.v) {
      dateCount++;
      if (dateCount <= 3) {
        console.log(`  Row ${row} date: "${dateCell.v}"`);
      }
    }
  }
  console.log('  Total dates found:', dateCount);
  console.log('');
  
  console.log('Step 7: Expected record count');
  console.log('  Platforms:', platformNames.length);
  console.log('  Dates:', dateCount);
  console.log('  Expected records:', platformNames.length * dateCount);
  
} catch (error) {
  console.error('ERROR:', error.message);
  console.error('Stack:', error.stack);
}

console.log('\n=== Test Complete ===');
