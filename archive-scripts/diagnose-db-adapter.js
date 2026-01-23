const fs = require('fs');

console.log('Diagnosing database adapter usage...\n');

// Check how other routes use the database
const routesPath = '/app/dist/routes';
const files = ['users.js', 'tasks.js', 'finance.js'];

files.forEach(file => {
  const filePath = `${routesPath}/${file}`;
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for db.prepare usage
    if (content.includes('db.prepare')) {
      console.log(`❌ ${file} uses db.prepare (OLD API)`);
    }
    
    // Check for dbCall usage
    if (content.includes('dbCall')) {
      console.log(`✅ ${file} uses dbCall (NEW API)`);
      
      // Show example
      const match = content.match(/dbCall\([^)]+\)/);
      if (match) {
        console.log(`   Example: ${match[0].substring(0, 80)}...`);
      }
    }
    
    // Check for req.db usage
    if (content.includes('req.db')) {
      console.log(`   ${file} accesses database via req.db`);
    }
    
    console.log('');
  }
});

console.log('\n=== KOL Routes Current Usage ===');
const kolPath = '/app/dist/routes/kol.js';
if (fs.existsSync(kolPath)) {
  const kolContent = fs.readFileSync(kolPath, 'utf8');
  
  if (kolContent.includes('db.prepare')) {
    console.log('❌ KOL routes uses OLD db.prepare API');
  }
  
  if (kolContent.includes('dbCall')) {
    console.log('✅ KOL routes uses NEW dbCall API');
  } else {
    console.log('⚠️  KOL routes does NOT use dbCall - needs migration');
  }
}
