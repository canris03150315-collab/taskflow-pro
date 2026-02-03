const fs = require('fs');

console.log('=== Finding All await Usage in auth.js ===\n');

const authPath = '/app/dist/routes/auth.js';

try {
  const content = fs.readFileSync(authPath, 'utf8');
  const lines = content.split('\n');
  
  console.log('Searching for all await keywords...\n');
  
  let awaitCount = 0;
  const awaitLocations = [];
  
  lines.forEach((line, index) => {
    if (line.includes('await')) {
      awaitCount++;
      const lineNum = index + 1;
      const trimmedLine = line.trim();
      awaitLocations.push({ line: lineNum, code: trimmedLine });
      console.log('Line ' + lineNum + ': ' + trimmedLine);
    }
  });
  
  console.log('\n=== Summary ===');
  console.log('Total await keywords found: ' + awaitCount);
  console.log('');
  
  if (awaitCount > 0) {
    console.log('DIAGNOSIS: Found ' + awaitCount + ' await statements');
    console.log('These need to be either:');
    console.log('  1. Removed (if calling sync functions)');
    console.log('  2. Kept with async handler (if calling async functions like bcrypt)');
  }
  
  console.log('');
  console.log('SUCCESS: Diagnosis complete');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
