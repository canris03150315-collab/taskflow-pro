const fs = require('fs');

console.log('=== Comprehensive Auth.js Diagnosis ===\n');

const authPath = '/app/dist/routes/auth.js';

try {
  const content = fs.readFileSync(authPath, 'utf8');
  
  console.log('[1/5] Checking file size and basic structure...');
  console.log('File size: ' + content.length + ' bytes');
  console.log('');
  
  console.log('[2/5] Searching for problematic async/await patterns...');
  const asyncDbGetPattern = /await\s+db\.get\(/g;
  const asyncDbRunPattern = /await\s+db\.run\(/g;
  const asyncDbAllPattern = /await\s+db\.all\(/g;
  
  const asyncGetMatches = content.match(asyncDbGetPattern) || [];
  const asyncRunMatches = content.match(asyncDbRunPattern) || [];
  const asyncAllMatches = content.match(asyncDbAllPattern) || [];
  
  console.log('Found await db.get(): ' + asyncGetMatches.length + ' occurrences');
  console.log('Found await db.run(): ' + asyncRunMatches.length + ' occurrences');
  console.log('Found await db.all(): ' + asyncAllMatches.length + ' occurrences');
  console.log('Total problematic patterns: ' + (asyncGetMatches.length + asyncRunMatches.length + asyncAllMatches.length));
  console.log('');
  
  console.log('[3/5] Identifying specific routes with issues...');
  const routes = [
    { name: '/setup/check', pattern: /router\.get\('\/setup\/check'[\s\S]*?\}\);/g },
    { name: '/login', pattern: /router\.post\('\/login'[\s\S]*?\}\);/g },
    { name: '/setup', pattern: /router\.post\('\/setup'[\s\S]*?\}\);/g },
    { name: '/change-password', pattern: /router\.post\('\/change-password'[\s\S]*?\}\);/g }
  ];
  
  const problematicRoutes = [];
  
  routes.forEach(route => {
    const matches = content.match(route.pattern);
    if (matches) {
      matches.forEach(match => {
        if (match.includes('await db.')) {
          problematicRoutes.push(route.name);
        }
      });
    }
  });
  
  console.log('Routes with async db issues:');
  if (problematicRoutes.length === 0) {
    console.log('  None found (this is unexpected)');
  } else {
    problematicRoutes.forEach(r => console.log('  - ' + r));
  }
  console.log('');
  
  console.log('[4/5] Checking for correct dbCall usage...');
  const correctDbCallPattern = /db\.db\.prepare\(/g;
  const correctMatches = content.match(correctDbCallPattern) || [];
  console.log('Found correct db.db.prepare(): ' + correctMatches.length + ' occurrences');
  console.log('');
  
  console.log('[5/5] Checking for async function declarations...');
  const asyncFunctionPattern = /router\.(get|post|put|delete)\([^,]+,\s*async\s*\(/g;
  const asyncFunctions = content.match(asyncFunctionPattern) || [];
  console.log('Found async route handlers: ' + asyncFunctions.length);
  console.log('');
  
  console.log('=== Summary ===');
  console.log('Total issues found: ' + (asyncGetMatches.length + asyncRunMatches.length + asyncAllMatches.length));
  console.log('Routes affected: ' + problematicRoutes.length);
  console.log('');
  
  if (asyncGetMatches.length + asyncRunMatches.length + asyncAllMatches.length > 0) {
    console.log('DIAGNOSIS: auth.js has incorrect async/await database calls');
    console.log('REQUIRED FIX: Replace await db.X() with db.db.prepare().X()');
    console.log('REQUIRED FIX: Remove async from route handlers');
  } else {
    console.log('DIAGNOSIS: No obvious async/await issues found');
    console.log('Need to check other potential problems');
  }
  
  console.log('');
  console.log('SUCCESS: Diagnosis complete');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
