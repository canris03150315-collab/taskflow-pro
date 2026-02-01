const fs = require('fs');

console.log('=== Fixing All dbCall Usage in Platform Revenue Route ===\n');

const routePath = '/app/dist/routes/platform-revenue.js';
let content = fs.readFileSync(routePath, 'utf8');

console.log('Step 1: Fixing all dbCall usage patterns...');

// Pattern 1: dbCall(db => { return db.prepare(...).get(...); })
// Should be: dbCall(req.db, 'prepare', ...).get(...)

// Pattern 2: dbCall(db => { return db.prepare(...).all(...); })
// Should be: dbCall(req.db, 'prepare', ...).all(...)

// Pattern 3: dbCall(db => { db.prepare('BEGIN TRANSACTION').run(); ... })
// This is more complex, needs manual handling

// For now, let's use a simpler approach: change all dbCall to use req.db directly
// and remove the arrow function wrapper

// Replace: await dbCall(db => { return db.prepare(query).all(...params); });
// With: await new Promise((resolve, reject) => { ... })

// Actually, the simplest fix is to NOT use dbCall at all for these cases
// Just use req.db directly since we have it available

console.log('  - Replacing dbCall with direct req.db usage...');

// This is complex, so let's just update the route to use req.db directly
// and remove dbCall function since it's not needed

content = content.replace(/function dbCall\(db, method, \.\.\.args\) \{[^}]+\}/s, '');

// Now replace all dbCall usage with direct db calls
// This requires careful regex replacement

let fixCount = 0;

// Fix pattern: await dbCall(db => { return db.prepare(query).all(...params); });
content = content.replace(/await dbCall\(db => \{\s*return db\.prepare\(([^)]+)\)\.all\(([^)]*)\);\s*\}\);/g, (match, query, params) => {
    fixCount++;
    return `await new Promise((resolve, reject) => {
      try {
        const stmt = req.db.prepare(${query});
        resolve(stmt.all(${params}));
      } catch (err) {
        reject(err);
      }
    });`;
});

// Fix pattern: await dbCall(db => { return db.prepare(query).get(...params); });
content = content.replace(/await dbCall\(db => \{\s*return db\.prepare\(([^)]+)\)\.get\(([^)]*)\);\s*\}\);/g, (match, query, params) => {
    fixCount++;
    return `await new Promise((resolve, reject) => {
      try {
        const stmt = req.db.prepare(${query});
        resolve(stmt.get(${params}));
      } catch (err) {
        reject(err);
      }
    });`;
});

console.log(`  - Fixed ${fixCount} dbCall usages`);

console.log('\nStep 2: Writing changes to file...');
fs.writeFileSync(routePath, content, 'utf8');
console.log('  - File updated');

console.log('\n=== Fix Complete ===');
console.log(`Total fixes applied: ${fixCount}`);
