const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('=== Departments Table Schema ===');
const schema = db.prepare("PRAGMA table_info(departments)").all();
console.log(JSON.stringify(schema, null, 2));

console.log('\n=== Current Departments ===');
const departments = db.prepare("SELECT * FROM departments").all();
console.log(JSON.stringify(departments, null, 2));

db.close();
console.log('\nSUCCESS');
