const fs = require('fs');

console.log('Fixing work-logs.js db calls...');

const routePath = '/app/dist/routes/work-logs.js';
let content = fs.readFileSync(routePath, 'utf8');

// Remove the incorrect dbCall function and replace with correct db usage
content = content.replace(/function dbCall\(db, method, \.\.\.args\) \{[\s\S]*?\}/g, '');
content = content.replace(/dbCall\(db, 'prepare', /g, 'db.prepare(');
content = content.replace(/dbCall\(db, 'get', /g, 'db.get(');
content = content.replace(/dbCall\(db, 'all', /g, 'db.all(');
content = content.replace(/dbCall\(db, 'run', /g, 'db.run(');

// Also need to fix the authenticateToken function to use correct db methods
const oldAuth = `function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: '\\u672A\\u63D0\\u4F9B\\u8A8D\\u8B49\\u4EE4\\u724C' });
  }

  try {
    const db = req.db;
    const auth = dbCall(db, 'prepare', 'SELECT * FROM auth_tokens WHERE token = ? AND expires_at > ?')
      .get(token, new Date().toISOString());
    
    if (!auth) {
      return res.status(401).json({ error: '\\u8A8D\\u8B49\\u4EE4\\u724C\\u7121\\u6548\\u6216\\u5DF2\\u904E\\u671F' });
    }

    const user = dbCall(db, 'prepare', 'SELECT * FROM users WHERE id = ?').get(auth.user_id);
    if (!user) {
      return res.status(401).json({ error: '\\u7528\\u6236\\u4E0D\\u5B58\\u5728' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: '\\u8A8D\\u8B49\\u932F\\u8AA4' });
  }
}`;

const newAuth = `function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: '\\u672A\\u63D0\\u4F9B\\u8A8D\\u8B49\\u4EE4\\u724C' });
  }

  try {
    const db = req.db;
    const auth = db.prepare('SELECT * FROM auth_tokens WHERE token = ? AND expires_at > ?')
      .get(token, new Date().toISOString());
    
    if (!auth) {
      return res.status(401).json({ error: '\\u8A8D\\u8B49\\u4EE4\\u724C\\u7121\\u6548\\u6216\\u5DF2\\u904E\\u671F' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(auth.user_id);
    if (!user) {
      return res.status(401).json({ error: '\\u7528\\u6236\\u4E0D\\u5B58\\u5728' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: '\\u8A8D\\u8B49\\u932F\\u8AA4' });
  }
}`;

content = content.replace(oldAuth, newAuth);

fs.writeFileSync(routePath, content, 'utf8');
console.log('SUCCESS: Fixed work-logs.js db calls');
console.log('DONE');
