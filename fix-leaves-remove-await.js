const fs = require('fs');

console.log('Removing incorrect await keywords from leaves.js...\n');

try {
  const filePath = '/app/dist/routes/leaves.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove await from db.run calls (they are synchronous in the wrapper)
  content = content.replace(/await db\.run\(/g, 'db.run(');
  
  // Remove await from db.all calls (they should already be async in route handlers)
  // Keep await for db.all and db.get since they might be async
  
  console.log('Removed incorrect await keywords');
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('\nLeaves.js fixed successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
