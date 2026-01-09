const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Checking tasks in database...');

const tasks = db.prepare('SELECT id, title, is_archived, status FROM tasks LIMIT 10').all();
console.log('Total tasks found:', tasks.length);
console.log('Tasks:', JSON.stringify(tasks, null, 2));

const archivedTasks = db.prepare('SELECT id, title, is_archived, status FROM tasks WHERE is_archived = 1').all();
console.log('Archived tasks:', archivedTasks.length);

db.close();
