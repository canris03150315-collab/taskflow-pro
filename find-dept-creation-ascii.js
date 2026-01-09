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
  'INSERT INTO departments',
  'CREATE TABLE'
];

searchPaths.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log('Not found:', filePath);
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
        console.log('\nFile:', fileName);
        foundAny = true;
      }
      console.log('  Found', term, ':', matches.length, 'times');
      
      // Show context for INSERT statements
      if (term.includes('INSERT')) {
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          if (line.match(regex)) {
            console.log('    Line', i + 1, ':', line.trim().substring(0, 80));
          }
        });
      }
    }
  });
  
  if (!foundAny) {
    console.log('OK:', fileName, '- No department creation found');
  }
});

console.log('\n=== Checking for database initialization ===');

// Check if there's a schema file or init script
const initPaths = [
  '/app/dist/schema.sql',
  '/app/dist/init.sql',
  '/app/schema.sql',
  '/app/init.sql',
  '/app/data/taskflow.db'
];

initPaths.forEach(p => {
  if (fs.existsSync(p)) {
    console.log('\nFound:', p);
    const stats = fs.statSync(p);
    console.log('  Size:', stats.size, 'bytes');
    console.log('  Modified:', stats.mtime);
  }
});
