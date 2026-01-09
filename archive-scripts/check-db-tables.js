const Database = require('./node_modules/better-sqlite3');
const db = new Database('/app/data/taskflow.db');

console.log('Checking database tables...');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();

console.log('\nAvailable tables:');
tables.forEach(table => {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    console.log(`- ${table.name}: ${count.count} records`);
});

db.close();
