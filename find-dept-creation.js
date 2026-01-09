const fs = require('fs');
const path = require('path');

console.log('=== Searching for department creation logic ===\n');

// Search in server files
const searchPaths = [
  '/app/dist/index.js',
  '/app/dist/server.js',
  '/app/dist/database-v2.js',
  '/app/dist/routes/departments.js'
];

const searchTerms = [
  'Engineering',
  'Marketing',
  'HR',
  '技術工程部',
  '市場行銷部',
  '人力資源部',
  'INSERT INTO departments',
  'CREATE TABLE.*departments'
];

searchPaths.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`✗ ${filePath} not found`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  let foundAny = false;
  searchTerms.forEach(term => {
    const regex = new RegExp(term, 'gi');
    const matches = content.match(regex);
    if (matches) {
      if (!foundAny) {
        console.log(`\n📁 ${fileName}:`);
        foundAny = true;
      }
      console.log(`  Found "${term}": ${matches.length} times`);
      
      // Show context for INSERT statements
      if (term.includes('INSERT')) {
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          if (line.match(regex)) {
            console.log(`    Line ${i + 1}: ${line.trim().substring(0, 100)}...`);
          }
        });
      }
    }
  });
  
  if (!foundAny) {
    console.log(`✓ ${fileName}: No department creation found`);
  }
});

console.log('\n=== Checking for database initialization ===');

// Check if there's a schema file or init script
const initPaths = [
  '/app/dist/schema.sql',
  '/app/dist/init.sql',
  '/app/schema.sql',
  '/app/init.sql'
];

initPaths.forEach(p => {
  if (fs.existsSync(p)) {
    console.log(`\n✓ Found: ${p}`);
    const content = fs.readFileSync(p, 'utf8');
    if (content.includes('Engineering') || content.includes('Marketing') || content.includes('HR')) {
      console.log('  ⚠️ Contains default departments!');
    }
  }
});
