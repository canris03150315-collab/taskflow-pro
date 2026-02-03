const fs = require('fs');

console.log('=== Fixing Auth.js - Use db.prepare() Directly ===\n');

const authPath = '/app/dist/routes/auth.js';

try {
  let content = fs.readFileSync(authPath, 'utf8');
  
  console.log('[1/2] Replacing all db.db.prepare() with db.prepare()...');
  const beforeLength = content.length;
  content = content.replace(/db\.db\.prepare\(/g, 'db.prepare(');
  const replacements = (beforeLength - content.length) / 3;
  console.log('Replaced ' + replacements + ' occurrences');
  
  console.log('[2/2] Writing fixed file...');
  fs.writeFileSync(authPath, content, 'utf8');
  
  console.log('');
  console.log('SUCCESS: All db.db.prepare() changed to db.prepare()');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
