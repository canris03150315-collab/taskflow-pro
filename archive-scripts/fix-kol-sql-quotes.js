const fs = require('fs');

console.log('Fixing SQL quotes in KOL routes...');

try {
  const kolPath = '/app/dist/routes/kol.js';
  let content = fs.readFileSync(kolPath, 'utf8');
  
  // Fix double quotes to single quotes for SQL string literals
  content = content.replace(/"ACTIVE"/g, "'ACTIVE'");
  content = content.replace(/date\("now"\)/g, "date('now')");
  
  fs.writeFileSync(kolPath, content, 'utf8');
  console.log('SUCCESS: Fixed SQL quotes in KOL routes');
  
} catch (error) {
  console.error('ERROR:', error);
  process.exit(1);
}
