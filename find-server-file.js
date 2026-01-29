const fs = require('fs');
const path = require('path');

console.log('=== Find Server Entry Point ===\n');

// Check package.json for start script
console.log('Test 1: Check package.json');
const packagePath = '/app/package.json';
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log('Start script:', pkg.scripts?.start);
  console.log('Main entry:', pkg.main);
}

// Check common server file locations
console.log('\nTest 2: Check common server file locations');
const possiblePaths = [
  '/app/dist/index.js',
  '/app/dist/server.js',
  '/app/dist/src/index.js',
  '/app/dist/src/server.js',
  '/app/server/dist/index.js',
  '/app/src/index.ts'
];

possiblePaths.forEach(p => {
  if (fs.existsSync(p)) {
    console.log(`✅ Found: ${p}`);
    const stat = fs.statSync(p);
    console.log(`   Size: ${stat.size} bytes`);
  } else {
    console.log(`❌ Not found: ${p}`);
  }
});

// Find files containing app.use
console.log('\nTest 3: Search for files containing app.use');
function searchFiles(dir, pattern) {
  const results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules')) {
      results.push(...searchFiles(filePath, pattern));
    } else if (stat.isFile() && file.endsWith('.js')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes(pattern)) {
        results.push(filePath);
      }
    }
  }
  
  return results;
}

const filesWithAppUse = searchFiles('/app/dist', 'app.use');
console.log('Files containing app.use:');
filesWithAppUse.forEach(f => console.log(`  - ${f}`));

if (filesWithAppUse.length > 0) {
  console.log('\nTest 4: Check first file with app.use');
  const mainFile = filesWithAppUse[0];
  console.log('Checking:', mainFile);
  const content = fs.readFileSync(mainFile, 'utf8');
  
  const appUseMatches = content.match(/app\.use\([^)]+\)/g);
  if (appUseMatches) {
    console.log('Route registrations:', appUseMatches.length);
    appUseMatches.slice(0, 20).forEach((match, i) => {
      console.log(`  ${i + 1}. ${match}`);
    });
  }
}

console.log('\n=== Search Complete ===');
