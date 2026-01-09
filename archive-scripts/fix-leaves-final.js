const fs = require('fs');

console.log('Fixing leaves.js with correct database API...\n');

try {
  const filePath = '/app/dist/routes/leaves.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace all dbCall patterns with correct db API
  
  // Pattern 1: dbCall(db, 'prepare', query).all(...params)
  // Should be: await db.all(query, params)
  content = content.replace(/dbCall\(db,\s*'prepare',\s*([^)]+)\)\.all\(\.\.\.([^)]+)\)/g, 'await db.all($1, $2)');
  
  // Pattern 2: dbCall(db, 'prepare', query).get(...params)  
  // Should be: await db.get(query, params)
  content = content.replace(/dbCall\(db,\s*'prepare',\s*([^)]+)\)\.get\(\.\.\.([^)]+)\)/g, 'await db.get($1, $2)');
  content = content.replace(/dbCall\(db,\s*'prepare',\s*([^)]+)\)\.get\(([^)]+)\)/g, 'await db.get($1, [$2])');
  
  // Pattern 3: dbCall(db, 'prepare', `...`).run(params...)
  // This is the tricky one - need to convert to: await db.run(`...`, [params...])
  // Find all dbCall prepare run patterns
  const runPattern = /dbCall\(db,\s*'prepare',\s*`([^`]+)`\)\.run\(\s*([^;]+?)\s*\);/gs;
  content = content.replace(runPattern, (match, sql, params) => {
    // Clean up params - remove trailing whitespace and newlines
    const cleanParams = params.trim().replace(/\s+/g, ' ');
    return `await db.run(\`${sql}\`, [${cleanParams}]);`;
  });
  
  console.log('Fixed all database calls');
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('\nLeaves.js fixed successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
}
