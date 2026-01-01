const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

const tasks = db.prepare('SELECT id, title, is_archived FROM tasks ORDER BY created_at DESC LIMIT 10').all();
console.log('Recent tasks:');
tasks.forEach(t => {
    console.log(`  ${t.id}: ${t.title} | archived: ${t.is_archived}`);
});
