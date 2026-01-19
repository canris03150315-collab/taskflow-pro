const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing AI assistant database calls...');

// Replace all dbCall with prepare to direct db methods
// Pattern 1: SELECT queries with dbCall prepare -> db.all or db.get
content = content.replace(
  /const stmt = dbCall\(db, 'prepare',\s*'SELECT \* FROM ai_conversations WHERE user_id = \? ORDER BY created_at DESC LIMIT \?'\s*\);\s*const conversations = dbCall\(stmt, 'all', userId, limit\);/g,
  "const conversations = await db.all('SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit]);"
);

// Pattern 2: INSERT with dbCall prepare -> db.run
content = content.replace(
  /const stmt = dbCall\(db, 'prepare',\s*'INSERT INTO ai_conversations \(id, user_id, role, message, created_at\)\s*VALUES \(\?, \?, \?, \?, \?\)'\s*\);\s*dbCall\(stmt, 'run', id, userId, role, message, now\);/g,
  "await db.run('INSERT INTO ai_conversations (id, user_id, role, message, created_at) VALUES (?, ?, ?, ?, ?)', [id, userId, role, message, now]);"
);

// Pattern 3: INSERT with intent and action
content = content.replace(
  /const stmt = dbCall\(db, 'prepare',\s*'INSERT INTO ai_conversations \(id, user_id, role, message, intent, action_taken, action_result, created_at\)\s*VALUES \(\?, \?, \?, \?, \?, \?, \?, \?\)'\s*\);\s*dbCall\(stmt, 'run', id, userId, role, message, intent, actionTaken, actionResult, now\);/g,
  "await db.run('INSERT INTO ai_conversations (id, user_id, role, message, intent, action_taken, action_result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, userId, role, message, intent, actionTaken, actionResult, now]);"
);

// Pattern 4: DELETE single conversation
content = content.replace(
  /const stmt = dbCall\(db, 'prepare',\s*'DELETE FROM ai_conversations WHERE id = \? AND user_id = \?'\s*\);\s*dbCall\(stmt, 'run', conversationId, userId\);/g,
  "await db.run('DELETE FROM ai_conversations WHERE id = ? AND user_id = ?', [conversationId, userId]);"
);

// Pattern 5: DELETE all conversations
content = content.replace(
  /const stmt = dbCall\(db, 'prepare',\s*'DELETE FROM ai_conversations WHERE user_id = \?'\s*\);\s*dbCall\(stmt, 'run', userId\);/g,
  "await db.run('DELETE FROM ai_conversations WHERE user_id = ?', [userId]);"
);

// Pattern 6: Get context data - users
content = content.replace(
  /const usersStmt = dbCall\(db, 'prepare',\s*'SELECT id, name, role, department FROM users'\s*\);\s*const users = dbCall\(usersStmt, 'all'\);/g,
  "const users = await db.all('SELECT id, name, role, department FROM users');"
);

// Pattern 7: Get context data - departments
content = content.replace(
  /const deptsStmt = dbCall\(db, 'prepare',\s*'SELECT id, name FROM departments'\s*\);\s*const departments = dbCall\(deptsStmt, 'all'\);/g,
  "const departments = await db.all('SELECT id, name FROM departments');"
);

// Pattern 8: Get context data - tasks
content = content.replace(
  /const tasksStmt = dbCall\(db, 'prepare',\s*'SELECT \* FROM tasks WHERE status != .*? LIMIT \?'\s*\);\s*const tasks = dbCall\(tasksStmt, 'all', 20\);/g,
  "const tasks = await db.all(\"SELECT * FROM tasks WHERE status != 'Completed' AND status != 'Cancelled' LIMIT ?\", [20]);"
);

// Pattern 9: Get context data - announcements
content = content.replace(
  /const announcementsStmt = dbCall\(db, 'prepare',\s*'SELECT \* FROM announcements ORDER BY created_at DESC LIMIT \?'\s*\);\s*const announcements = dbCall\(announcementsStmt, 'all', 5\);/g,
  "const announcements = await db.all('SELECT * FROM announcements ORDER BY created_at DESC LIMIT ?', [5]);"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fixed AI assistant database methods');
