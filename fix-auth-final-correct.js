const fs = require('fs');

console.log('=== Final Correct Fix for Auth.js ===\n');

const authPath = '/app/dist/routes/auth.js';

try {
  let content = fs.readFileSync(authPath, 'utf8');
  
  console.log('[1/2] Replacing db.prepare() with db.db.prepare()...');
  const beforeLength = content.length;
  content = content.replace(/(\s+const\s+\w+\s*=\s*)db\.prepare\(/g, '$1db.db.prepare(');
  content = content.replace(/(\s+)db\.prepare\(/g, '$1db.db.prepare(');
  const afterLength = content.length;
  const diff = afterLength - beforeLength;
  console.log('Added ' + diff + ' characters (added .db)');
  
  console.log('[2/2] Writing fixed file...');
  fs.writeFileSync(authPath, content, 'utf8');
  
  console.log('');
  console.log('SUCCESS: All db.prepare() changed to db.db.prepare()');
  console.log('NOTE: req.db is a Database class wrapper, req.db.db is the actual better-sqlite3 instance');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
