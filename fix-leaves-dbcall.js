const fs = require('fs');

console.log('Fixing leaves.js dbCall function...\n');

try {
  const filePath = '/app/dist/routes/leaves.js';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the incorrect dbCall function with direct database calls
  // The issue is that dbCall tries to use db[method] which doesn't work with better-sqlite3
  
  // Fix 1: Replace dbCall(db, 'prepare', query).all() with db.prepare(query).all()
  content = content.replace(/dbCall\(db, 'prepare', (.+?)\)\.all\((.+?)\)/g, 'db.prepare($1).all($2)');
  
  // Fix 2: Replace dbCall(db, 'prepare', query).get() with db.prepare(query).get()
  content = content.replace(/dbCall\(db, 'prepare', (.+?)\)\.get\((.+?)\)/g, 'db.prepare($1).get($2)');
  
  // Fix 3: Replace dbCall(db, 'prepare', query).run() with db.prepare(query).run()
  content = content.replace(/dbCall\(db, 'prepare', (.+?)\)\.run\(/g, 'db.prepare($1).run(');
  
  console.log('Fixed dbCall usage in leaves.js');
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('\nLeaves.js dbCall fixed successfully');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
