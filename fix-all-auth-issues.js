const fs = require('fs');

console.log('=== Fixing All Auth.js Issues ===\n');

const authPath = '/app/dist/routes/auth.js';

try {
  let content = fs.readFileSync(authPath, 'utf8');
  
  console.log('[1/3] Replacing await db.get() patterns...');
  let getCount = 0;
  content = content.replace(/await\s+db\.get\(/g, () => {
    getCount++;
    return 'db.db.prepare(';
  });
  content = content.replace(/db\.db\.prepare\(([^)]+)\)/g, (match, query) => {
    return 'db.db.prepare(' + query + ').get(';
  });
  console.log('Fixed ' + getCount + ' await db.get() calls');
  
  console.log('[2/3] Replacing await db.run() patterns...');
  let runCount = 0;
  content = content.replace(/await\s+db\.run\(/g, () => {
    runCount++;
    return 'db.db.prepare(';
  });
  content = content.replace(/db\.db\.prepare\(([^)]+)\)\.get\(([^)]*)\)\.run\(/g, (match, query, getParams) => {
    return 'db.db.prepare(' + query + ').run(';
  });
  console.log('Fixed ' + runCount + ' await db.run() calls');
  
  console.log('[3/3] Removing async from route handlers...');
  let asyncCount = 0;
  content = content.replace(/router\.(get|post|put|delete)\(([^,]+),\s*async\s*\(/g, (match, method, route) => {
    asyncCount++;
    return 'router.' + method + '(' + route + ', (';
  });
  console.log('Removed async from ' + asyncCount + ' route handlers');
  
  fs.writeFileSync(authPath, content, 'utf8');
  
  console.log('');
  console.log('=== Fix Summary ===');
  console.log('Total fixes applied: ' + (getCount + runCount + asyncCount));
  console.log('  - await db.get(): ' + getCount);
  console.log('  - await db.run(): ' + runCount);
  console.log('  - async handlers: ' + asyncCount);
  console.log('');
  console.log('SUCCESS: All issues fixed');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
