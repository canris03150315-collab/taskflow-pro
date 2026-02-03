const fs = require('fs');

const filePath = '/app/dist/routes/ai-assistant.js';
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing AI assistant database calls (complete replacement)...');

// 1. Fix GET /conversations - chained .all()
content = content.replace(
  /const conversations = dbCall\(db, 'prepare',\s+'SELECT \* FROM ai_conversations WHERE user_id = \? ORDER BY created_at DESC LIMIT \?'\s+\)\.all\(userId, limit\);/,
  "const conversations = await db.all('SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit]);"
);

// 2. Fix INSERT user message - chained .run()
content = content.replace(
  /dbCall\(db, 'prepare',\s+'INSERT INTO ai_conversations \(id, user_id, role, message, created_at\)\s+VALUES \(\?, \?, \?, \?, \?\)'\s+\)\.run\(id, userId, 'user', message, now\);/,
  "await db.run('INSERT INTO ai_conversations (id, user_id, role, message, created_at) VALUES (?, ?, ?, ?, ?)', [id, userId, 'user', message, now]);"
);

// 3. Fix INSERT assistant message - chained .run()
content = content.replace(
  /dbCall\(db, 'prepare',\s+'INSERT INTO ai_conversations \(id, user_id, role, message, intent, action_taken, action_result, created_at\)\s+VALUES \(\?, \?, \?, \?, \?, \?, \?, \?\)'\s+\)\.run\(assistantId, userId, 'assistant', responseMessage, intent, actionTaken, actionResult, assistantNow\);/,
  "await db.run('INSERT INTO ai_conversations (id, user_id, role, message, intent, action_taken, action_result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [assistantId, userId, 'assistant', responseMessage, intent, actionTaken, actionResult, assistantNow]);"
);

// 4. Fix DELETE single conversation
content = content.replace(
  /dbCall\(db, 'prepare',\s+'DELETE FROM ai_conversations WHERE id = \? AND user_id = \?'\s+\)\.run\(conversationId, userId\);/,
  "await db.run('DELETE FROM ai_conversations WHERE id = ? AND user_id = ?', [conversationId, userId]);"
);

// 5. Fix DELETE all conversations
content = content.replace(
  /dbCall\(db, 'prepare',\s+'DELETE FROM ai_conversations WHERE user_id = \?'\s+\)\.run\(userId\);/,
  "await db.run('DELETE FROM ai_conversations WHERE user_id = ?', [userId]);"
);

// 6. Fix context data - users
content = content.replace(
  /const users = dbCall\(db, 'prepare',\s+'SELECT id, name, role, department FROM users'\s+\)\.all\(\);/,
  "const users = await db.all('SELECT id, name, role, department FROM users');"
);

// 7. Fix context data - departments
content = content.replace(
  /const departments = dbCall\(db, 'prepare',\s+'SELECT id, name FROM departments'\s+\)\.all\(\);/,
  "const departments = await db.all('SELECT id, name FROM departments');"
);

// 8. Fix context data - tasks
content = content.replace(
  /const tasks = dbCall\(db, 'prepare',\s+'SELECT \* FROM tasks WHERE status != \'Completed\' AND status != \'Cancelled\' LIMIT \?'\s+\)\.all\(20\);/,
  "const tasks = await db.all(\"SELECT * FROM tasks WHERE status != 'Completed' AND status != 'Cancelled' LIMIT ?\", [20]);"
);

// 9. Fix context data - announcements
content = content.replace(
  /const announcements = dbCall\(db, 'prepare',\s+'SELECT \* FROM announcements ORDER BY created_at DESC LIMIT \?'\s+\)\.all\(5\);/,
  "const announcements = await db.all('SELECT * FROM announcements ORDER BY created_at DESC LIMIT ?', [5]);"
);

// 10. Fix history query in POST /query
content = content.replace(
  /const history = dbCall\(db, 'prepare',\s+'SELECT role, message FROM ai_conversations WHERE user_id = \? ORDER BY created_at DESC LIMIT \?'\s+\)\.all\(userId, 10\);/,
  "const history = await db.all('SELECT role, message FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, 10]);"
);

fs.writeFileSync(filePath, content, 'utf8');

// Verify fix
const newContent = fs.readFileSync(filePath, 'utf8');
const dbCallCount = (newContent.match(/dbCall\(/g) || []).length;
const dbAllCount = (newContent.match(/db\.all\(/g) || []).length;
const dbRunCount = (newContent.match(/db\.run\(/g) || []).length;

console.log('\n=== Verification ===');
console.log('Remaining dbCall count:', dbCallCount);
console.log('New db.all count:', dbAllCount);
console.log('New db.run count:', dbRunCount);

if (dbCallCount <= 2 && (dbAllCount > 0 || dbRunCount > 0)) {
  console.log('\n✅ SUCCESS: AI assistant database methods fixed');
} else {
  console.log('\n⚠️ WARNING: Some patterns may not have been replaced');
}
