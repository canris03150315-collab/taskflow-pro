const fs = require('fs');

console.log('Migrating KOL routes to use dbCall adapter...\n');

try {
  const kolPath = '/app/dist/routes/kol.js';
  let content = fs.readFileSync(kolPath, 'utf8');
  
  // Add dbCall import at the top
  if (!content.includes('dbCall')) {
    const routerPattern = /const { v4: uuidv4 } = require\('uuid'\);/;
    content = content.replace(routerPattern, `$&\nconst { dbCall } = require('../utils/dbCall');`);
    console.log('✅ Added dbCall import');
  }
  
  // Replace all db.prepare().get() patterns
  content = content.replace(
    /db\.prepare\(([\s\S]*?)\)\.get\((.*?)\)/g,
    'dbCall(db, "get", $1, $2)'
  );
  console.log('✅ Replaced db.prepare().get() with dbCall(db, "get", ...)');
  
  // Replace all db.prepare().all() patterns
  content = content.replace(
    /db\.prepare\(([\s\S]*?)\)\.all\((.*?)\)/g,
    'dbCall(db, "all", $1, $2)'
  );
  console.log('✅ Replaced db.prepare().all() with dbCall(db, "all", ...)');
  
  // Replace all db.prepare().run() patterns
  content = content.replace(
    /db\.prepare\(([\s\S]*?)\)\.run\((.*?)\)/g,
    'dbCall(db, "run", $1, $2)'
  );
  console.log('✅ Replaced db.prepare().run() with dbCall(db, "run", ...)');
  
  fs.writeFileSync(kolPath, content, 'utf8');
  console.log('\n✅ KOL routes migrated to dbCall successfully');
  
} catch (error) {
  console.error('❌ Migration error:', error);
  process.exit(1);
}
