const fs = require('fs');

console.log('=== Fixing Auth.js (Pure ASCII Method) ===\n');

const authPath = '/app/dist/routes/auth.js';

try {
  const content = fs.readFileSync(authPath, 'utf8');
  
  console.log('[1/2] Reading original auth.js...');
  console.log('File size: ' + content.length + ' bytes');
  
  console.log('[2/2] Creating fixed version...');
  
  const fixedContent = content
    .replace(/router\.get\('\/setup\/check',\s*async\s*\(req,\s*res\)\s*=>\s*\{[\s\S]*?const\s+db\s*=\s*req\.db;[\s\S]*?const\s+result\s*=\s*await\s+db\.get\('SELECT COUNT\(\*\) as count FROM users'\);[\s\S]*?res\.json\(\{[\s\S]*?needsSetup:\s*result\.count\s*===\s*0,[\s\S]*?userCount:\s*result\.count[\s\S]*?\}\);[\s\S]*?\}\s*catch[\s\S]*?\{[\s\S]*?console\.error[\s\S]*?res\.status\(500\)\.json[\s\S]*?\}\s*\}\);/,
      "router.get('/setup/check', (req, res) => {\n  try {\n    const db = req.db;\n    const result = db.db.prepare('SELECT COUNT(*) as count FROM users').get();\n    res.json({\n      needsSetup: result.count === 0,\n      userCount: result.count\n    });\n  } catch (error) {\n    console.error('Setup check error:', error);\n    res.status(500).json({ error: error.message });\n  }\n});")
    .replace(/router\.post\('\/login',\s*async\s*\(req,\s*res\)\s*=>/g, "router.post('/login', (req, res) =>")
    .replace(/const\s+userRow\s*=\s*await\s+db\.get\('SELECT \* FROM users WHERE username = \?',\s*\[username\]\);/g, "const userRow = db.db.prepare('SELECT * FROM users WHERE username = ?').get(username);")
    .replace(/router\.post\('\/setup',\s*async\s*\(req,\s*res\)\s*=>/g, "router.post('/setup', (req, res) =>")
    .replace(/const\s+existingUsers\s*=\s*await\s+db\.get\('SELECT COUNT\(\*\) as count FROM users'\);/g, "const existingUsers = db.db.prepare('SELECT COUNT(*) as count FROM users').get();")
    .replace(/await\s+db\.run\('INSERT INTO users[\s\S]*?VALUES[\s\S]*?',\s*\[([^\]]+)\]\);/g, "db.db.prepare('INSERT INTO users (id, username, password, name, role, department, avatar, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run($1);")
    .replace(/router\.post\('\/change-password',\s*async\s*\(req,\s*res\)\s*=>/g, "router.post('/change-password', (req, res) =>")
    .replace(/const\s+user\s*=\s*await\s+db\.get\('SELECT \* FROM users WHERE id = \?',\s*\[userId\]\);/g, "const user = db.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);")
    .replace(/await\s+db\.run\('UPDATE users SET password = \?, updated_at = \? WHERE id = \?',\s*\[([^\]]+)\]\);/g, "db.db.prepare('UPDATE users SET password = ?, updated_at = ? WHERE id = ?').run($1);");
  
  if (fixedContent !== content) {
    fs.writeFileSync(authPath, fixedContent, 'utf8');
    console.log('SUCCESS: auth.js fixed');
    console.log('Changes applied: ' + (content.length - fixedContent.length) + ' bytes difference');
  } else {
    console.log('WARNING: No changes detected');
  }
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
