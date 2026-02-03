const fs = require('fs');

console.log('Fixing work-logs.js - final fix for all db calls...');

const routePath = '/app/dist/routes/work-logs.js';
let content = fs.readFileSync(routePath, 'utf8');

// Replace all db.prepare().all() with db.all()
content = content.replace(/db\.prepare\(([^)]+)\)\.all\(([^)]*)\)/g, 'await db.all($1, [$2])');

// Replace all db.prepare().get() with db.get()
content = content.replace(/db\.prepare\(([^)]+)\)\.get\(([^)]*)\)/g, 'await db.get($1, [$2])');

// Replace all db.prepare().run() with db.run()
content = content.replace(/db\.prepare\(([^)]+)\)\.run\(([^)]*)\)/g, 'await db.run($1, [$2])');

// Fix query building pattern - parameters should be passed as array
// For queries with params array already built
content = content.replace(/await db\.all\(query, \[\.\.\.params\]\)/g, 'await db.all(query, params)');

fs.writeFileSync(routePath, content, 'utf8');
console.log('SUCCESS: All db calls fixed in work-logs.js');
console.log('DONE');
