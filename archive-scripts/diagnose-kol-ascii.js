const Database = require('better-sqlite3');
const path = require('path');

console.log('=== KOL System Complete Diagnosis ===\n');

try {
  // 1. Check database connection
  console.log('1. Checking database...');
  const dbPath = path.join('/app/data', 'taskflow.db');
  const db = new Database(dbPath);
  console.log('SUCCESS: Database connected');
  
  // 2. Check if KOL tables exist
  console.log('\n2. Checking KOL table structure...');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'kol_%'").all();
  console.log(`Found ${tables.length} KOL tables:`, tables.map(t => t.name));
  
  if (tables.length === 0) {
    console.log('WARNING: KOL tables do not exist, need to create');
  } else {
    console.log('SUCCESS: KOL tables exist');
    
    // Check each table structure
    tables.forEach(table => {
      const info = db.prepare(`PRAGMA table_info(${table.name})`).all();
      console.log(`\n   ${table.name} columns:`, info.map(i => i.name).join(', '));
    });
  }
  
  // 3. Check KOL routes file
  console.log('\n3. Checking KOL routes file...');
  const fs = require('fs');
  const kolRoutePath = '/app/dist/routes/kol.js';
  
  if (fs.existsSync(kolRoutePath)) {
    console.log('SUCCESS: KOL routes file exists');
    
    const content = fs.readFileSync(kolRoutePath, 'utf8');
    
    // Check key imports
    const hasAuthToken = content.includes('authenticateToken');
    const hasDbCall = content.includes('function dbCall') || content.includes('dbCall');
    const hasRouter = content.includes('module.exports = router');
    
    console.log('   - authenticateToken:', hasAuthToken ? 'YES' : 'NO');
    console.log('   - dbCall function:', hasDbCall ? 'YES' : 'NO');
    console.log('   - module.exports:', hasRouter ? 'YES' : 'NO');
    
    // Check route definitions
    const routes = content.match(/router\.(get|post|put|delete)\(/g);
    console.log(`   - Number of routes defined: ${routes ? routes.length : 0}`);
    
  } else {
    console.log('ERROR: KOL routes file does not exist');
  }
  
  // 4. Check route registration in server.js
  console.log('\n4. Checking route registration...');
  const serverPath = '/app/dist/server.js';
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  
  const hasKolImport = serverContent.includes('kol') || serverContent.includes('KOL');
  const hasKolRoute = serverContent.includes("/api/kol");
  
  console.log('   - KOL route import:', hasKolImport ? 'YES' : 'NO');
  console.log('   - KOL route registration:', hasKolRoute ? 'YES' : 'NO');
  
  // 5. Test simple query
  console.log('\n5. Testing database query...');
  if (tables.length > 0) {
    try {
      const count = db.prepare('SELECT COUNT(*) as count FROM kol_profiles').get();
      console.log(`SUCCESS: kol_profiles query successful, count: ${count.count}`);
    } catch (error) {
      console.log('ERROR: Query failed:', error.message);
    }
  }
  
  db.close();
  
  console.log('\n=== Diagnosis Complete ===');
  
} catch (error) {
  console.error('ERROR during diagnosis:', error);
  process.exit(1);
}
