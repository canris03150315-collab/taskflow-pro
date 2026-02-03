const fs = require('fs');

console.log('=== Final Fix for Platform Revenue Route ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(routePath, 'utf8');

console.log('Step 1: Add const db = req.db to all route handlers...');

// Add const db = req.db; at the beginning of each route handler
const routeHandlers = [
  '/parse',
  '/import',
  '/',
  '/platforms',
  '/stats',
  '/stats/by-date',
  '/history/:transactionId',
  '/history',
  '/:id',
  '/restore/:historyId',
  '/export'
];

routeHandlers.forEach(route => {
  // Find the route handler and add const db = req.db; after try {
  const patterns = [
    new RegExp(`router\\.post\\('${route.replace(/:/g, '\\:')}', authenticateToken[^{]*\\{\\s*try \\{`, 'g'),
    new RegExp(`router\\.get\\('${route.replace(/:/g, '\\:')}', authenticateToken[^{]*\\{\\s*try \\{`, 'g'),
    new RegExp(`router\\.put\\('${route.replace(/:/g, '\\:')}', authenticateToken[^{]*\\{\\s*try \\{`, 'g'),
    new RegExp(`router\\.delete\\('${route.replace(/:/g, '\\:')}', authenticateToken[^{]*\\{\\s*try \\{`, 'g')
  ];
  
  patterns.forEach(pattern => {
    content = content.replace(pattern, (match) => {
      if (!match.includes('const db = req.db')) {
        return match + '\n    const db = req.db;';
      }
      return match;
    });
  });
});

console.log('  - Added const db = req.db to route handlers');

console.log('\nStep 2: Fix all dbCall usage...');

// Replace: await dbCall(db => { return db.prepare(query).get(...); });
// With: dbCall(db, 'prepare', query).get(...)

// This is complex, so let's use a simpler approach
// Replace the arrow function pattern with direct calls

let fixCount = 0;

// Pattern 1: await dbCall(db => { return db.prepare('...').get(...); });
while (content.includes('await dbCall(db => {')) {
  content = content.replace(
    /await dbCall\(db => \{\s*return db\.prepare\(/,
    'dbCall(db, \'prepare\', '
  );
  content = content.replace(/\)\.get\(([^)]*)\);\s*\}\);/, ').get($1);');
  content = content.replace(/\)\.all\(([^)]*)\);\s*\}\);/, ').all($1);');
  fixCount++;
  if (fixCount > 100) break; // Safety limit
}

// Pattern 2: await dbCall(db => { db.prepare('BEGIN TRANSACTION').run(); ...
// This needs to be handled differently - just remove the await dbCall wrapper
content = content.replace(
  /await dbCall\(db => \{\s*db\.prepare\('BEGIN TRANSACTION'\)\.run\(\);/g,
  'db.prepare(\'BEGIN TRANSACTION\').run();'
);

// Remove remaining closing }); from dbCall blocks
content = content.replace(/\s*\}\);(\s*\/\/ End transaction block)?/g, '');

console.log(`  - Fixed ${fixCount} dbCall usages`);

console.log('\nStep 3: Writing changes to file...');
fs.writeFileSync(routePath, content, 'utf8');
console.log('  - File updated');

console.log('\n=== Fix Complete ===');
console.log('\nNext step: Restart container and test');
