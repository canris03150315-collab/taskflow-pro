const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Announcement Data ===');
const ann = db.prepare('SELECT id, title, created_by, read_by FROM announcements LIMIT 1').get();
console.log(JSON.stringify(ann, null, 2));

console.log('\n=== Users Data ===');
const users = db.prepare('SELECT id, username, name FROM users LIMIT 5').all();
console.log(JSON.stringify(users, null, 2));

console.log('\n=== Total Users Count ===');
const count = db.prepare('SELECT COUNT(*) as total FROM users').get();
console.log(count);

db.close();
