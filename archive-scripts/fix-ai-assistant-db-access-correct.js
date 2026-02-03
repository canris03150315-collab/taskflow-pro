const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
console.log('=== Fixing AI Assistant Database Access ===\n');

let content = fs.readFileSync(filePath, 'utf8');

console.log('1. Fixing authenticateToken to use req.db instead of req.app.locals.db...');

// Fix authenticateToken function
const oldAuth = `function authenticateToken(req, res, next) {
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

const newAuth = `function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const db = req.db;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(token);
  if (!user) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  req.user = user;
  next();
}`;

content = content.replace(oldAuth, newAuth);

console.log('2. Fixing route handlers to use req.db instead of req.app.locals.db...');

// Fix all req.app.locals.db to req.db
content = content.replace(/req\.app\.locals\.db/g, 'req.db');

fs.writeFileSync(filePath, content, 'utf8');

console.log('\n=== SUCCESS ===');
console.log('✅ Changed req.app.locals.db to req.db');
console.log('✅ AI Assistant should now work correctly!');
