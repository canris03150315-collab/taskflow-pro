const fs = require('fs');

console.log('Fixing leaves.js to use correct db API...\n');

try {
  const filePath = '/app/dist/routes/leaves.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace db.prepare(query).all(...params) with db.all(query, params)
  content = content.replace(/db\.prepare\(([^)]+)\)\.all\(\.\.\.([^)]+)\)/g, 'await db.all($1, $2)');
  
  // Replace db.prepare(query).get(...params) with db.get(query, params)
  content = content.replace(/db\.prepare\(([^)]+)\)\.get\(\.\.\.([^)]+)\)/g, 'await db.get($1, $2)');
  content = content.replace(/db\.prepare\(([^)]+)\)\.get\(([^)]+)\)/g, 'await db.get($1, [$2])');
  
  // Replace db.prepare(query).run(...) with db.run(query, ...)
  content = content.replace(/db\.prepare\(`([^`]+)`\)\.run\(/g, 'await db.run(`$1`, ');
  
  console.log('Fixed db API usage in leaves.js');
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('\nLeaves.js db API fixed successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
