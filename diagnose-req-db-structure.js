console.log('=== Diagnosing req.db Structure ===\n');

try {
  console.log('[1/3] Loading database module...');
  const databaseModule = require('/app/dist/database.js');
  console.log('Database module type:', typeof databaseModule);
  console.log('Database module keys:', Object.keys(databaseModule));
  console.log('');
  
  console.log('[2/3] Checking Database class...');
  if (databaseModule.Database) {
    console.log('Database class found');
    const dbInstance = new databaseModule.Database('/app/data/taskflow.db');
    console.log('Database instance type:', typeof dbInstance);
    console.log('Database instance keys:', Object.keys(dbInstance).slice(0, 10));
    console.log('');
    console.log('Has .db property:', 'db' in dbInstance);
    console.log('Has .prepare method:', 'prepare' in dbInstance);
    console.log('');
    if (dbInstance.db) {
      console.log('dbInstance.db type:', typeof dbInstance.db);
      console.log('dbInstance.db.prepare exists:', typeof dbInstance.db.prepare);
    }
    if (dbInstance.prepare) {
      console.log('dbInstance.prepare exists:', typeof dbInstance.prepare);
    }
  } else {
    console.log('No Database class found');
  }
  console.log('');
  
  console.log('[3/3] Checking server.js middleware...');
  const fs = require('fs');
  const serverContent = fs.readFileSync('/app/dist/server.js', 'utf8');
  const dbMiddlewareMatch = serverContent.match(/req\.db\s*=\s*([^;]+);/);
  if (dbMiddlewareMatch) {
    console.log('Found db middleware:');
    console.log(dbMiddlewareMatch[0]);
  } else {
    console.log('Could not find db middleware pattern');
  }
  
  console.log('');
  console.log('SUCCESS: Diagnosis complete');
  
} catch (error) {
  console.error('ERROR:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
