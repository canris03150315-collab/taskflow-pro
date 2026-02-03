const fs = require('fs');

console.log('=== Final Auth.js Fix (Keep async for bcrypt) ===\n');

const authPath = '/app/dist/routes/auth.js';

try {
  let content = fs.readFileSync(authPath, 'utf8');
  
  console.log('[1/3] Fixing /setup/check route (no bcrypt, remove async)...');
  content = content.replace(
    /router\.get\('\/setup\/check',\s*async\s*\(req,\s*res\)\s*=>\s*\{[\s\S]*?const\s+result\s*=\s*await\s+db\.get\('SELECT COUNT\(\*\) as count FROM users'\);/,
    "router.get('/setup/check', (req, res) => {\n  try {\n    const db = req.db;\n    const result = db.db.prepare('SELECT COUNT(*) as count FROM users').get();"
  );
  
  console.log('[2/3] Fixing database calls in /login (keep async for bcrypt)...');
  content = content.replace(
    /const\s+userRow\s*=\s*await\s+db\.get\('SELECT \* FROM users WHERE username = \?',\s*\[username\]\);/,
    "const userRow = db.db.prepare('SELECT * FROM users WHERE username = ?').get(username);"
  );
  
  console.log('[3/3] Fixing database calls in /setup and /change-password...');
  content = content.replace(
    /const\s+existingUsers\s*=\s*await\s+db\.get\('SELECT COUNT\(\*\) as count FROM users'\);/g,
    "const existingUsers = db.db.prepare('SELECT COUNT(*) as count FROM users').get();"
  );
  content = content.replace(
    /const\s+existingUser\s*=\s*await\s+db\.get\('SELECT id FROM users WHERE username = \?',\s*\[username\]\);/,
    "const existingUser = db.db.prepare('SELECT id FROM users WHERE username = ?').get(username);"
  );
  content = content.replace(
    /const\s+deptExists\s*=\s*await\s+db\.get\('SELECT id FROM departments WHERE id = \?',\s*\[department \|\| 'Management'\]\);/,
    "const deptExists = db.db.prepare('SELECT id FROM departments WHERE id = ?').get(department || 'Management');"
  );
  content = content.replace(
    /await\s+db\.run\(`INSERT INTO users \(id, name, role, department, avatar, username, password, created_at, updated_at\)[\s\S]*?VALUES[\s\S]*?`,\s*\[([^\]]+)\]\);/,
    "db.db.prepare('INSERT INTO users (id, name, role, department, avatar, username, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run($1);"
  );
  content = content.replace(
    /const\s+userRow\s*=\s*await\s+db\.get\('SELECT \* FROM users WHERE id = \?',\s*\[decoded\.id\]\);/g,
    "const userRow = db.db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);"
  );
  content = content.replace(
    /await\s+db\.run\('UPDATE users SET password = \?, updated_at = datetime\(\\\'now\\\'\) WHERE id = \?',\s*\[hashedNewPassword, decoded\.id\]\);/,
    "db.db.prepare('UPDATE users SET password = ?, updated_at = ? WHERE id = ?').run(hashedNewPassword, new Date().toISOString(), decoded.id);"
  );
  
  fs.writeFileSync(authPath, content, 'utf8');
  
  console.log('');
  console.log('SUCCESS: All database calls fixed');
  console.log('NOTE: async/await kept for bcrypt functions (hashPassword, verifyPassword)');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
