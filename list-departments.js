const db = require('./node_modules/better-sqlite3')('/app/data/taskflow.db');
const depts = db.prepare('SELECT id, name FROM departments').all();
console.log(JSON.stringify(depts, null, 2));
db.close();
