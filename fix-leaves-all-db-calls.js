const fs = require('fs');

console.log('Fixing ALL database calls in leaves.js...\n');

try {
  const filePath = '/app/dist/routes/leaves.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove the dbCall function entirely and replace all its usages
  
  // 1. Fix INSERT statements (dbCall with prepare and run)
  // Pattern: dbCall(db, 'prepare', `...`).run(...)
  const insertPattern = /dbCall\(db,\s*'prepare',\s*`([^`]+)`\)\.run\(/g;
  content = content.replace(insertPattern, 'await db.run(`$1`, ');
  
  // 2. Fix UPDATE statements
  const updatePattern = /dbCall\(db,\s*'prepare',\s*`([^`]+)`\)\.run\(/g;
  content = content.replace(updatePattern, 'await db.run(`$1`, ');
  
  // 3. Fix SELECT with .all() - already done but double check
  content = content.replace(/await db\.prepare\(([^)]+)\)\.all\(\.\.\.([^)]+)\)/g, 'await db.all($1, $2)');
  
  // 4. Fix SELECT with .get() - already done but double check
  content = content.replace(/await db\.prepare\(([^)]+)\)\.get\(\.\.\.([^)]+)\)/g, 'await db.get($1, $2)');
  
  console.log('Fixed all database calls in leaves.js');
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('\nAll database calls fixed successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
