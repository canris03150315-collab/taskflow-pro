const Database = require('better-sqlite3');
const db = new Database('/app/data/taskflow.db');

const ann = db.prepare('SELECT id, title, read_by FROM announcements ORDER BY created_at DESC LIMIT 1').get();
console.log('Title:', ann.title);
console.log('read_by raw:', ann.read_by);

const readBy = JSON.parse(ann.read_by || '[]');
console.log('read_by parsed:', JSON.stringify(readBy));
console.log('Count:', readBy.length);

const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
console.log('Total users:', users.count);

db.close();
