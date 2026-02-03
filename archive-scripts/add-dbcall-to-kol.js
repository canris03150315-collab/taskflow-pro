const fs = require('fs');

console.log('Adding dbCall helper function to KOL routes...\n');

try {
  const kolPath = '/app/dist/routes/kol.js';
  let content = fs.readFileSync(kolPath, 'utf8');
  
  // Check if dbCall already exists
  if (content.includes('function dbCall')) {
    console.log('✅ dbCall function already exists');
  } else {
    // Add dbCall function after the authenticateToken import
    const authImportPattern = /const { authenticateToken } = require\('\.\.\/middleware\/auth'\);/;
    
    if (!authImportPattern.test(content)) {
      console.error('❌ Could not find authenticateToken import');
      process.exit(1);
    }
    
    const dbCallFunction = `

// Database call helper function
function dbCall(db, method, ...args) {
  if (typeof db[method] === 'function') {
    return db[method](...args);
  }
  if (db.db && typeof db.db[method] === 'function') {
    return db.db[method](...args);
  }
  throw new Error(\`Method \${method} not found on database object\`);
}`;
    
    content = content.replace(authImportPattern, `$&${dbCallFunction}`);
    console.log('✅ Added dbCall helper function');
  }
  
  // Now replace all db.prepare patterns with dbCall
  // Replace db.prepare(...).get(...)
  content = content.replace(
    /db\.prepare\(([^)]+)\)\.get\(([^)]*)\)/g,
    "dbCall(db, 'prepare', $1).get($2)"
  );
  console.log('✅ Replaced db.prepare().get() patterns');
  
  // Replace db.prepare(...).all(...)
  content = content.replace(
    /db\.prepare\(([^)]+)\)\.all\(([^)]*)\)/g,
    "dbCall(db, 'prepare', $1).all($2)"
  );
  console.log('✅ Replaced db.prepare().all() patterns');
  
  // Replace db.prepare(...).run(...)
  content = content.replace(
    /db\.prepare\(([^)]+)\)\.run\(([^)]*)\)/g,
    "dbCall(db, 'prepare', $1).run($2)"
  );
  console.log('✅ Replaced db.prepare().run() patterns');
  
  fs.writeFileSync(kolPath, content, 'utf8');
  console.log('\n✅ KOL routes updated successfully with dbCall');
  
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
