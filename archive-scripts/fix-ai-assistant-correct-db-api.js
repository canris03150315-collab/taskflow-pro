const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
console.log('=== Fixing AI Assistant Database API ===\n');

let content = fs.readFileSync(filePath, 'utf8');

// Step 1: Fix getSystemContext function signature (remove async)
console.log('1. Removing async from getSystemContext...');
content = content.replace('async function getSystemContext(db) {', 'function getSystemContext(db) {');

// Step 2: Fix all database queries to use synchronous better-sqlite3 API
console.log('2. Converting database queries to synchronous API...');

// Fix: await db.all('SELECT ...') -> db.prepare('SELECT ...').all()
content = content.replace(
  /await db\.all\('SELECT id, name, role, department, username, created_at FROM users'\)/g,
  "db.prepare('SELECT id, name, role, department, username, created_at FROM users').all()"
);

content = content.replace(
  /await db\.all\('SELECT id, name FROM departments'\)/g,
  "db.prepare('SELECT id, name FROM departments').all()"
);

content = content.replace(
  /await db\.all\(`SELECT id, title, status, urgency, assigned_to_user_id, deadline FROM tasks WHERE status != 'Completed' LIMIT 50`\)/g,
  "db.prepare(`SELECT id, title, status, urgency, assigned_to_user_id, deadline FROM tasks WHERE status != 'Completed' LIMIT 50`).all()"
);

content = content.replace(
  /await db\.get\(`SELECT COUNT\(\*\) as count FROM tasks WHERE status = 'Completed'`\)/g,
  "db.prepare(`SELECT COUNT(*) as count FROM tasks WHERE status = 'Completed'`).get()"
);

content = content.replace(
  /await db\.all\('SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC LIMIT 10'\)/g,
  "db.prepare('SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC LIMIT 10').all()"
);

// Fix: await db.all('SELECT ...', [param]) -> db.prepare('SELECT ...').all(param)
content = content.replace(
  /await db\.all\('SELECT user_id, date, status FROM attendance_records WHERE date >= \? ORDER BY date DESC LIMIT 100', \[sevenDaysAgo\]\)/g,
  "db.prepare('SELECT user_id, date, status FROM attendance_records WHERE date >= ? ORDER BY date DESC LIMIT 100').all(sevenDaysAgo)"
);

content = content.replace(
  /await db\.all\('SELECT id, content, created_at FROM memos ORDER BY created_at DESC LIMIT 10'\)/g,
  "db.prepare('SELECT id, content, created_at FROM memos ORDER BY created_at DESC LIMIT 10').all()"
);

// Step 3: Fix route handlers to not use await for getSystemContext
console.log('3. Fixing route handlers...');
content = content.replace(
  /const systemContext = await getSystemContext\(db\);/g,
  'const systemContext = getSystemContext(db);'
);

fs.writeFileSync(filePath, content, 'utf8');

console.log('\n=== SUCCESS ===');
console.log('✅ Removed async from getSystemContext');
console.log('✅ Converted all db.all() to db.prepare().all()');
console.log('✅ Converted all db.get() to db.prepare().get()');
console.log('✅ Fixed route handlers to use synchronous calls');
console.log('\nAI Assistant should now work correctly with better-sqlite3!');
