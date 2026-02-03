const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
console.log('=== Fixing AI Assistant to use Async Database API ===\n');

let content = fs.readFileSync(filePath, 'utf8');

console.log('1. Fixing authenticateToken to use async API...');

// Fix authenticateToken function to use async API
const oldAuth = `function authenticateToken(req, res, next) {
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

const newAuth = `async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const db = req.db;
    const user = await db.get('SELECT * FROM users WHERE id = ?', [token]);
    if (!user) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}`;

content = content.replace(oldAuth, newAuth);

console.log('2. Fixing getSystemContext to use async API...');

// Fix getSystemContext to use async API
const oldGetContext = `function getSystemContext(db) {
  const users = db.prepare('SELECT id, name, role, department, username, created_at FROM users').all();
  const departments = db.prepare('SELECT id, name FROM departments').all();
  
  const activeTasks = db.prepare(\`SELECT id, title, status, urgency, assigned_to_user_id, deadline FROM tasks WHERE status != 'Completed' LIMIT 50\`).all();
  const completedTasksCount = db.prepare(\`SELECT COUNT(*) as count FROM tasks WHERE status = 'Completed'\`).get();
  
  const recentAnnouncements = db.prepare('SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC LIMIT 10').all();
  
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const attendanceRecords = db.prepare('SELECT user_id, date, status FROM attendance_records WHERE date >= ? ORDER BY date DESC LIMIT 100').all(sevenDaysAgo);
  
  const recentMemos = db.prepare('SELECT id, content, created_at FROM memos ORDER BY created_at DESC LIMIT 10').all();
  
  return {
    users,
    departments,
    activeTasks,
    completedTasksCount: completedTasksCount.count,
    recentAnnouncements,
    attendanceRecords,
    recentMemos
  };
}`;

const newGetContext = `async function getSystemContext(db) {
  const users = await db.all('SELECT id, name, role, department, username, created_at FROM users');
  const departments = await db.all('SELECT id, name FROM departments');
  
  const activeTasks = await db.all(\`SELECT id, title, status, urgency, assigned_to_user_id, deadline FROM tasks WHERE status != 'Completed' LIMIT 50\`);
  const completedTasksCount = await db.get(\`SELECT COUNT(*) as count FROM tasks WHERE status = 'Completed'\`);
  
  const recentAnnouncements = await db.all('SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC LIMIT 10');
  
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const attendanceRecords = await db.all('SELECT user_id, date, status FROM attendance_records WHERE date >= ? ORDER BY date DESC LIMIT 100', [sevenDaysAgo]);
  
  const recentMemos = await db.all('SELECT id, content, created_at FROM memos ORDER BY created_at DESC LIMIT 10');
  
  return {
    users,
    departments,
    activeTasks,
    completedTasksCount: completedTasksCount.count,
    recentAnnouncements,
    attendanceRecords,
    recentMemos
  };
}`;

content = content.replace(oldGetContext, newGetContext);

console.log('3. Fixing route handlers to await getSystemContext...');

// Fix route handlers to await getSystemContext
content = content.replace(
  /const systemContext = getSystemContext\(db\);/g,
  'const systemContext = await getSystemContext(db);'
);

// Fix conversations route to use async API
content = content.replace(
  /const conversations = db\.prepare\(\s*'SELECT \* FROM ai_conversations WHERE user_id = \? ORDER BY created_at DESC, rowid DESC LIMIT 50'\s*\)\.all\(userId\);/g,
  "const conversations = await db.all('SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 50', [userId]);"
);

// Fix INSERT statements to use async API
content = content.replace(
  /db\.prepare\(\s*'INSERT INTO ai_conversations \(id, user_id, role, message, created_at\) VALUES \(\?, \?, \?, \?, \?\)'\s*\)\.run\(([^)]+)\);/g,
  "await db.run('INSERT INTO ai_conversations (id, user_id, role, message, created_at) VALUES (?, ?, ?, ?, ?)', [$1]);"
);

// Fix SELECT for recent conversations
content = content.replace(
  /const recentConversations = db\.prepare\(\s*'SELECT role, message FROM ai_conversations WHERE user_id = \? ORDER BY created_at DESC LIMIT 10'\s*\)\.all\(userId\);/g,
  "const recentConversations = await db.all('SELECT role, message FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [userId]);"
);

fs.writeFileSync(filePath, content, 'utf8');

console.log('\n=== SUCCESS ===');
console.log('✅ Changed authenticateToken to async function');
console.log('✅ Changed getSystemContext to async function');
console.log('✅ Changed all db.prepare().get/all/run() to await db.get/all/run()');
console.log('✅ AI Assistant should now work with async database API!');
