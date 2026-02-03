const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing AI assistant database access...\n');

// Fix authenticateToken to use correct db access
const oldAuth = `function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const users = req.app.locals.db.prepare('SELECT * FROM users WHERE id = ?').all(token);
  if (users.length === 0) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  req.user = users[0];
  next();
}`;

const newAuth = `function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const db = req.app.locals.db;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(token);
  if (!user) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  req.user = user;
  next();
}`;

content = content.replace(oldAuth, newAuth);

// Fix getSystemContext to use synchronous methods
content = content.replace(/await db\.all\(/g, 'db.prepare(');
content = content.replace(/await db\.get\(/g, 'db.prepare(');
content = content.replace(/\.all\(\[/g, ').all(');
content = content.replace(/\]\);/g, ');');

// Fix async function to sync
content = content.replace('async function getSystemContext(db) {', 'function getSystemContext(db) {');

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed AI assistant database access');
console.log('- Changed authenticateToken to use correct db access');
console.log('- Changed getSystemContext to use synchronous methods');
