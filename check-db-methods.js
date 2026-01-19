const fs = require('fs');

console.log('=== Checking database usage in other routes ===\n');

// Check users.js
const usersPath = '/app/dist/routes/users.js';
if (fs.existsSync(usersPath)) {
  const usersContent = fs.readFileSync(usersPath, 'utf8');
  
  // Find database query patterns
  const getMatch = usersContent.match(/db\.get\([^)]+\)/);
  const allMatch = usersContent.match(/db\.all\([^)]+\)/);
  const runMatch = usersContent.match(/db\.run\([^)]+\)/);
  
  console.log('users.js database patterns:');
  if (getMatch) console.log('- db.get:', getMatch[0].substring(0, 100));
  if (allMatch) console.log('- db.all:', allMatch[0].substring(0, 100));
  if (runMatch) console.log('- db.run:', runMatch[0].substring(0, 100));
  console.log('');
}

// Check tasks.js
const tasksPath = '/app/dist/routes/tasks.js';
if (fs.existsSync(tasksPath)) {
  const tasksContent = fs.readFileSync(tasksPath, 'utf8');
  
  const getMatch = tasksContent.match(/db\.get\([^)]+\)/);
  const allMatch = tasksContent.match(/db\.all\([^)]+\)/);
  
  console.log('tasks.js database patterns:');
  if (getMatch) console.log('- db.get:', getMatch[0].substring(0, 100));
  if (allMatch) console.log('- db.all:', allMatch[0].substring(0, 100));
  console.log('');
}

console.log('=== Database methods should use: db.get(), db.all(), db.run() ===');
