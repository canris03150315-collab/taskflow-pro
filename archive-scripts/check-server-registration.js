const fs = require('fs');

console.log('=== Check Server Route Registration ===\n');

const serverPath = '/app/dist/index.js';
const content = fs.readFileSync(serverPath, 'utf8');

console.log('Test 1: Find all app.use() registrations');
const appUseMatches = content.match(/app\.use\([^)]+\)/g);
if (appUseMatches) {
  console.log('Found', appUseMatches.length, 'route registrations:');
  appUseMatches.forEach((match, i) => {
    console.log(`  ${i + 1}. ${match}`);
  });
} else {
  console.log('No app.use() found!');
}

console.log('\nTest 2: Check for attendance import');
const hasAttendanceImport = content.includes('attendance') || content.includes('Attendance');
console.log('Has attendance import:', hasAttendanceImport);

if (hasAttendanceImport) {
  // Find the import line
  const lines = content.split('\n');
  const importLines = lines.filter(line => 
    (line.includes('attendance') || line.includes('Attendance')) && 
    (line.includes('require') || line.includes('import'))
  );
  console.log('Import lines:', importLines.join('\n'));
}

console.log('\nTest 3: Search for attendance in entire file');
const attendanceOccurrences = content.split('\n').filter((line, index) => {
  if (line.toLowerCase().includes('attendance')) {
    console.log(`  Line ${index + 1}: ${line.trim()}`);
    return true;
  }
  return false;
});
console.log('Total occurrences:', attendanceOccurrences.length);

console.log('\n=== Check Complete ===');
