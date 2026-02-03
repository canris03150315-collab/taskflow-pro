const fs = require('fs');

console.log('=== Fixing Auth.js with Correct Pattern ===\n');

const authPath = '/app/dist/routes/auth.js';

try {
  let content = fs.readFileSync(authPath, 'utf8');
  const originalLength = content.length;
  
  console.log('[1/4] Fixing await db.get() with single parameter...');
  content = content.replace(/await db\.get\('([^']+)'\)/g, "db.db.prepare('$1').get()");
  
  console.log('[2/4] Fixing await db.get() with parameters...');
  content = content.replace(/await db\.get\('([^']+)',\s*\[([^\]]+)\]\)/g, "db.db.prepare('$1').get($2)");
  
  console.log('[3/4] Fixing await db.run() patterns...');
  content = content.replace(/await db\.run\('([^']+)',\s*\[([^\]]+)\]\)/g, "db.db.prepare('$1').run($2)");
  content = content.replace(/await db\.run\('([^']+)'\)/g, "db.db.prepare('$1').run()");
  
  console.log('[4/4] Removing async from route handlers...');
  content = content.replace(/router\.(get|post|put|delete)\('([^']+)',\s*async\s*\(req,\s*res\)\s*=>/g, "router.$1('$2', (req, res) =>");
  
  if (content.length !== originalLength) {
    fs.writeFileSync(authPath, content, 'utf8');
    console.log('');
    console.log('SUCCESS: File modified');
    console.log('Original size: ' + originalLength + ' bytes');
    console.log('New size: ' + content.length + ' bytes');
  } else {
    console.log('');
    console.log('WARNING: No changes made');
  }
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
